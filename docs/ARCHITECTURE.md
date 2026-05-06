# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Clients                                │
│        (REST API, WebSocket, Webhooks)                      │
└──────────────┬────────────────────────────────────────────┬─┘
               │                                            │
               ▼                                            ▼
        ┌────────────────┐                         ┌─────────────┐
        │   HTTP API     │                         │  WebSocket  │
        │  Endpoints     │                         │  Gateway    │
        └────────┬───────┘                         └────────┬────┘
                 │                                         │
        ┌────────▼─────────────────────────────────────────▼──────┐
        │                NestJS Application                       │
        │                                                          │
        ├──────────────────────────────────────────────────────────┤
        │                  Controllers Layer                       │
        │  ┌──────────────┐        ┌────────────────┐            │
        │  │ Wallets      │        │ Deposits       │            │
        │  │ Controller   │        │ Controller     │            │
        │  └──────┬───────┘        └────────┬───────┘            │
        │         │                         │                     │
        ├─────────┼─────────────────────────┼────────────────────┤
        │         │    Services Layer        │                   │
        │         ▼                          ▼                     │
        │  ┌──────────────┐        ┌────────────────┐            │
        │  │ Wallets      │        │ Deposits       │            │
        │  │ Service      │        │ Service        │            │
        │  │              │        │                │            │
        │  │ • Create     │        │ • Ingest       │            │
        │  │ • List       │        │ • Queue Job    │            │
        │  │ • FindOne    │        │ • Idempotent   │            │
        │  └──────────────┘        └────────┬───────┘            │
        │                                   │                     │
        ├───────────────────────────────────┼────────────────────┤
        │         Guards & Middleware        │                   │
        │         (API Key Auth)             ▼                    │
        │                          ┌────────────────┐            │
        │                          │ Deposits       │            │
        │                          │ Processor      │            │
        │                          │ (BullMQ Worker)│            │
        │                          │                │            │
        │                          │ • Process Job  │            │
        │                          │ • Callback Retry│            │
        │                          │ • Event Emit   │            │
        │                          └────────┬───────┘            │
        │                                   │                     │
        │                          ┌────────▼────────┐           │
        │                          │ Deposit Updates │           │
        │                          │ Gateway         │           │
        │                          │ (Socket.IO)     │           │
        │                          └──────────────────┘          │
        └─────────────┬────────────────────────────────┬─────────┘
                      │                                │
                      ▼                                ▼
        ┌──────────────────────────┐    ┌──────────────────────────┐
        │     PostgreSQL 16        │    │      Redis 7             │
        │    (Prisma Client)       │    │   (BullMQ Queue)         │
        │                          │    │                          │
        │ ┌────────────────────┐   │    │ ┌──────────────────────┐ │
        │ │ Wallet             │   │    │ │ Job Queue            │ │
        │ │ • address (PK)     │   │    │ │ • Serialized jobs    │ │
        │ │ • createdAt        │   │    │ │ • State management   │ │
        │ └─────────┬──────────┘   │    │ └──────────────────────┘ │
        │           │              │    │                          │
        │ ┌─────────▼──────────┐   │    └──────────────────────────┘
        │ │ Transaction        │   │
        │ │ • id (CUID)        │   │
        │ │ • walletAddress(FK)│   │
        │ │ • transactionHash  │   │
        │ │ • amount (Decimal) │   │
        │ │ • status (ENUM)    │   │
        │ │ • timestamps       │   │
        │ └────────────────────┘   │
        │                          │
        └──────────────────────────┘
```

## Core Components

### 1. HTTP API Layer

**Wallets Controller** (`src/wallets/wallets.controller.ts`)
- `POST /wallets` - Create new wallet
- `GET /wallets` - List all wallets (paginated)
- `GET /wallets/:address` - Get wallet with transaction history

**Deposits Controller** (`src/deposits/deposits.controller.ts`)
- `POST /deposits` - Idempotent deposit ingestion

**Security:**
- All endpoints require `x-api-key` header authentication
- ApiKeyGuard validates against `process.env.API_KEY`
- Global ValidationPipe enforces DTO validation

### 2. Business Logic Layer

**Wallets Service** (`src/wallets/wallets.service.ts`)
```typescript
- create(address): Wallet
- findAll(): Wallet[]
- findOne(address): Wallet with transactions
```

Handles:
- Duplicate prevention (P2002 unique constraint)
- Transaction history retrieval
- Wallet lifecycle management

**Deposits Service** (`src/deposits/deposits.service.ts`)
```typescript
- ingest(dto): Promise<{idempotent, transaction}>
```

Handles:
- Wallet existence validation
- Idempotent deposit creation via transactionHash uniqueness
- Job queue enqueuing

### 3. Async Processing Layer

**Deposits Processor** (`src/deposits/deposits.processor.ts`)
- BullMQ Worker extending `WorkerHost`
- Processes one job at a time
- Implements serializable transactions (Prisma isolation level)

**Processing Flow:**
1. Fetch transaction by ID
2. Verify status is PENDING
3. Simulate processing (500ms delay)
4. Update transaction to PROCESSED
5. Trigger HTTP callback with retries (3 attempts, exponential backoff)
6. Emit WebSocket events on success/failure

**Reliability:**
- Serializable isolation prevents concurrent processing
- Exponential backoff: 2s, 4s, 8s between retries
- Graceful failure handling with event emission

### 4. Real-time Communication Layer

**Deposit Updates Gateway** (`src/deposits/deposit-updates.gateway.ts`)
- Socket.IO WebSocket gateway on `/deposits` namespace
- CORS enabled for all origins (configurable)

**Subscription Model:**
- Clients emit `subscribe.wallet` with walletAddress
- Joins room: `wallet:{address}`

**Events Emitted:**
- `deposit.processed` - Transaction successfully processed
- `deposit.callback_failed` - Callback failed after retries

### 5. Data Access Layer

**Prisma Service** (`src/prisma/prisma.service.ts`)
- Extends PrismaClient
- Uses PrismaPg adapter for PostgreSQL
- Connection pooling managed by adapter
- Global singleton across application

**Models:**
```prisma
model Wallet {
  address       String        @id
  transactions  Transaction[]
  createdAt     DateTime      @default(now())
}

model Transaction {
  id              String        @id @default(cuid())
  walletAddress   String
  wallet          Wallet        @relation(fields: [walletAddress], references: [address])
  transactionHash String        @unique
  amount          Decimal       @db.Decimal(20, 8)
  status          TransactionStatus
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

enum TransactionStatus {
  PENDING
  PROCESSED
  FAILED
}
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js 22 Alpine | Production runtime |
| **Framework** | NestJS 11 | Application framework |
| **Language** | TypeScript 5.7 | Type-safe development |
| **Database** | PostgreSQL 16 | Persistent data storage |
| **ORM** | Prisma v7 | Type-safe DB access |
| **Queue** | BullMQ 5.76 | Async job processing |
| **Cache** | Redis 7 | Queue & cache layer |
| **WebSocket** | Socket.IO 4.8 | Real-time communication |
| **HTTP Client** | Axios | External requests |
| **Validation** | class-validator | Request validation |
| **Documentation** | Swagger 7.4 | API documentation |
| **Linting** | ESLint 9 | Code quality |
| **Formatting** | Prettier 3.4 | Code consistency |
| **Pre-commit** | Husky 9 | Git hooks |
| **Containerization** | Docker & Compose | Deployment |

## Data Flow: Deposit Ingestion

```
1. Client POST /deposits
   ├─ ApiKeyGuard validates x-api-key
   ├─ ValidationPipe validates DTO
   └─ DepositsController.ingest()
       │
2. DepositsService.ingest()
   ├─ Verify wallet exists
   ├─ Create Transaction (PENDING)
   │  └─ transactionHash unique constraint ensures idempotency
   ├─ Enqueue BullMQ job { transactionId }
   └─ Return { idempotent, transaction }
       │
3. BullMQ Job Queue (Redis)
   ├─ Store job with state
   ├─ DepositsProcessor picks up job
   │
4. DepositsProcessor.process()
   ├─ Start Serializable transaction
   ├─ Fetch transaction by ID
   ├─ Verify status = PENDING
   ├─ Simulate 500ms processing
   ├─ Update status → PROCESSED
   ├─ Emit WebSocket: deposit.processed
   │
5. sendCallbackWithRetry()
   ├─ Attempt 1: POST callback (timeout 5s)
   │  ├─ Success → Return
   │  └─ Fail → Wait 2s
   ├─ Attempt 2: POST callback
   │  ├─ Success → Return
   │  └─ Fail → Wait 4s
   ├─ Attempt 3: POST callback
   │  ├─ Success → Return
   │  └─ Fail → Emit deposit.callback_failed
   │
6. WebSocket Clients
   ├─ Subscribed to wallet room
   ├─ Receive deposit.processed event
   └─ Update UI in real-time
```

## Transaction Safety

### Idempotency
- **Deposit Ingestion**: `transactionHash` is unique constraint
  - Duplicate hash → Returns existing transaction with `idempotent: true`
  - Prevents duplicate processing of same deposit

### Concurrency Control
- **Job Processing**: Serializable isolation level in Prisma transaction
  - Prevents concurrent updates to same transaction
  - Guards against retried jobs or race conditions
  - Trade-off: Slightly slower than Read Committed, but strong consistency

### Reliability
- **Job Persistence**: BullMQ persists jobs in Redis
- **Webhook Retries**: Exponential backoff (2s, 4s, 8s)
- **Event Emission**: Asynchronous updates to WebSocket clients

## Deployment Architecture

### Docker Multi-stage Build

```dockerfile
Stage 1: development
  - Full npm packages
  - Hot reload via nodemon
  - Debug port exposed

Stage 2: builder
  - Production npm packages
  - TypeScript compilation

Stage 3: production
  - Minimal image (node:22-alpine)
  - Compiled JavaScript only
  - Prisma schema included
  - No dev dependencies
```

### Container Orchestration

**docker-compose.yml:**
- `app` service on port 3000
- `db` service (PostgreSQL) on port 5433
- `redis` service on port 6379
- Named volumes for data persistence
- Health checks on all services

**docker-compose.dev.yml:**
- Overrides app to development target
- Mounts source code volumes for hot reload
- Exposes debug port 9229
- Enables database inspection

## Performance Characteristics

| Operation | Time | Notes |
|-----------|------|-------|
| POST /wallets | ~5ms | Single DB insert |
| GET /wallets | ~10ms | Index scan, pagination |
| POST /deposits (idempotent) | ~2ms | Unique constraint check |
| Deposit processing | ~500ms | Simulated work + DB update |
| Callback retry cycle | ~14s | 2s + 4s + 8s delays |
| WebSocket event delivery | ~10ms | In-memory message |

## Scalability Considerations

### Horizontal Scaling
- **Stateless API**: Multiple app instances possible
- **Shared Queue**: Redis BullMQ supports multiple workers
- **Shared Database**: PostgreSQL connection pooling

### Vertical Scaling
- **Database**: Increase Prisma connection pool
- **Redis**: Allocate more memory
- **Application**: Increase Node.js heap size

### Optimization Opportunities
- Database query caching layer
- Redis-based session store
- GraphQL for flexible queries
- Microservice decomposition
- Database read replicas

## Security Architecture

### Authentication
- API Key validation on all HTTP endpoints
- No authentication on WebSocket (can be added)

### Authorization
- Role-based access control (not yet implemented)
- Per-wallet access control (future)

### Data Protection
- SQL injection prevention: Prisma parameterized queries
- XSS prevention: Server-side rendering N/A (API only)
- CORS: Wildcard enabled (should restrict in production)
- HTTPS: Enforce in production via load balancer

### Secrets Management
- Environment variables (not committed)
- `.env.example` for documentation
- No hardcoded credentials

## Monitoring & Observability

### Logging
- Structured logging via NestJS Logger
- Log levels: log, warn, error, debug
- Stored in Docker logs

### Metrics
- Response times (implicit via logs)
- Error rates (callback failures logged)
- Queue depth (BullMQ built-in)

### Tracing
- Request IDs (can be added)
- Correlation IDs (can be added)
- Distributed tracing (future)

## Future Enhancements

1. **Authentication & Authorization**
   - JWT tokens
   - Role-based access control
   - Multi-tenant support

2. **Advanced Features**
   - Webhook signature verification
   - Rate limiting per API key
   - Request logging & audit trail
   - Transaction history export

3. **Resilience**
   - Dead letter queues for failed jobs
   - Circuit breaker pattern
   - Graceful shutdown handlers
   - Health check improvements

4. **Observability**
   - Prometheus metrics export
   - Structured JSON logging
   - Distributed tracing (OpenTelemetry)
   - APM integration

5. **Performance**
   - Database query optimization
   - Redis caching layer
   - GraphQL endpoint
   - Request compression

## References

- [NestJS Architecture](https://docs.nestjs.com/overview/introduction)
- [Prisma Best Practices](https://www.prisma.io/docs/concepts/more/best-practices)
- [BullMQ Documentation](https://docs.bullmq.io)
- [Socket.IO Namespaces](https://socket.io/docs/v4/namespaces/)
- [PostgreSQL Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
