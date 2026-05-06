# Product Setup Instructions

## Overview

Real-time Deposit Processing Backend is a production-ready NestJS application designed to handle cryptocurrency deposit transactions with real-time status updates, async processing, and reliable callback mechanisms.

## Prerequisites

- **Node.js**: v22 LTS or higher
- **Docker**: Latest version with Docker Compose
- **PostgreSQL**: v16 (via Docker)
- **Redis**: v7 (via Docker)
- **npm**: v10 or higher

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd realtime-deposite-processing-backend
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Key Environment Variables:**

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/deposit_db?schema=public
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=deposit_db

# Redis (for BullMQ queue)
REDIS_HOST=localhost
REDIS_PORT=6379

# API Security
API_KEY=dev-api-key

# Webhook Callback
CALLBACK_URL=https://example.com/webhook
```

### 3. Docker Setup

**Development Environment:**

```bash
# Start all services (PostgreSQL, Redis, App)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Fresh restart with clean volumes
docker compose down -v
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

**Production Environment:**

```bash
# Build and run production-optimized containers
docker compose up --build

# Background mode
docker compose up -d --build
```

**Service Ports:**
- App: `http://localhost:3000`
- PostgreSQL: `localhost:5433` (external), `db:5432` (internal)
- Redis: `localhost:6379`

### 4. Database Setup

Prisma migrations are automatically applied in Docker. For manual setup:

```bash
# Generate Prisma client
npx prisma generate

# Run pending migrations
npx prisma migrate deploy

# View database (Prisma Studio)
npx prisma studio
```

### 5. Start Development Server

```bash
# Via npm (local development)
npm run start:dev

# Or via Docker (already running)
docker compose logs -f app
```

## Development Workflow

### Available Commands

```bash
# Development
npm run start:dev       # Watch mode with hot reload

# Building
npm run build           # Production build

# Code Quality
npm run lint            # Run ESLint with auto-fix
npm run format          # Format code with Prettier

# Testing
npm run test            # Unit tests
npm run test:e2e        # E2E tests
npm run test:cov        # Coverage report

# Git Hooks
npm run prepare         # Setup Husky pre-commit hooks
```

### Pre-commit Hooks

Husky and lint-staged automatically:
- Run ESLint on staged TypeScript files
- Format code with Prettier
- Verify no commits with linting errors

## API Documentation

### Swagger UI

Access interactive API documentation:

```
http://localhost:3000/api/docs
```

### Authentication

All HTTP endpoints require the `x-api-key` header:

```bash
curl -H "x-api-key: dev-api-key" http://localhost:3000/wallets
```

### Core Endpoints

**Wallets:**
- `POST /wallets` - Create wallet
- `GET /wallets` - List all wallets
- `GET /wallets/:address` - Get wallet with transactions

**Deposits:**
- `POST /deposits` - Ingest deposit (idempotent via transactionHash)

### Request Examples

**Create Wallet:**
```bash
curl -X POST http://localhost:3000/wallets \
  -H "x-api-key: dev-api-key" \
  -H "Content-Type: application/json" \
  -d '{"address": "wallet-123"}'
```

**Ingest Deposit:**
```bash
curl -X POST http://localhost:3000/deposits \
  -H "x-api-key: dev-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "wallet-123",
    "transactionHash": "0xabc123...",
    "amount": 100.5
  }'
```

## Real-time WebSocket Integration

### Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/deposits', {
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('Connected to deposits namespace');
});
```

### Subscribe to Wallet Updates

```javascript
// Listen for subscription confirmation
socket.on('subscribe.wallet', (response) => {
  console.log('Subscribed to room:', response.room);
});

// Subscribe to wallet
socket.emit('subscribe.wallet', 'wallet-123');

// Listen for processed deposits
socket.on('deposit.processed', (transaction) => {
  console.log('Deposit processed:', transaction);
});

// Listen for callback failures
socket.on('deposit.callback_failed', (event) => {
  console.log('Callback failed:', event);
});
```

## Docker Compose Structure

### Services

1. **app** (NestJS Backend)
   - Port: 3000
   - Debug: 9229 (dev only)
   - Dependencies: db, redis
   - Health: Checks `/health`

2. **db** (PostgreSQL 16)
   - Port: 5433 → 5432
   - Volume: postgres_data
   - Health: SQL ping check

3. **redis** (Redis 7)
   - Port: 6379
   - Volume: redis_data
   - Health: Redis ping check

### Volumes

- `postgres_data` - Database persistence
- `redis_data` - Cache persistence
- Named volume for node_modules (dev)

### Development Overrides

The `docker-compose.dev.yml` adds:
- Volume mounts for live code reload
- Debug port (9229) exposure
- Development target for Dockerfile

## Troubleshooting

### Port Already in Use

```bash
# Check what's using port 5433
lsof -i :5433

# Or change port in docker-compose.yml
```

### Database Connection Issues

```bash
# Verify database is running
docker compose ps

# Check logs
docker compose logs db

# Restart database
docker compose down -v
docker compose up db
```

### Fresh Start

```bash
# Complete reset with fresh volumes
docker compose down -v
rm -rf node_modules
npm install
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### TypeScript/ESLint Issues

```bash
# Clear Prettier cache
rm -rf node_modules/.cache

# Reinstall dependencies
npm ci

# Run type check
npx tsc --noEmit

# Fix linting
npm run lint
```

## Production Deployment Checklist

- [ ] Update environment variables in `.env`
- [ ] Set strong `API_KEY` value
- [ ] Configure `CALLBACK_URL` to production endpoint
- [ ] Update PostgreSQL credentials
- [ ] Enable HTTPS for WebSocket connections
- [ ] Configure database backups
- [ ] Set up monitoring and logging
- [ ] Update CORS origins in `@WebSocketGateway` decorator
- [ ] Test callback webhook endpoint
- [ ] Review and adjust retry logic (MAX_CALLBACK_RETRIES)

## Performance Tuning

### Database Optimization

```prisma
# Current isolation level: Serializable
# Prevents race conditions and concurrent processing
Prisma.TransactionIsolationLevel.Serializable
```

### Queue Configuration

BullMQ is configured to:
- Process one job at a time per worker
- Retry failed jobs with backoff
- Use Redis for job persistence

### Connection Pooling

Prisma PrismaPg adapter automatically manages:
- Connection pool sizing
- Query optimization
- Transaction handling

## Documentation

- [Architecture Overview](./ARCHITECTURE.md) - System design and component details
- [API Endpoints](../API_ENDPOINTS.md) - REST API reference
- [WebSocket Integration](../WEBSOCKET_REALTIME_INTEGRATION.md) - Real-time updates guide
- [Prisma Schema](../prisma/schema.prisma) - Data model

## Support & Resources

- NestJS: https://nestjs.com
- Prisma: https://prisma.io
- Socket.IO: https://socket.io
- BullMQ: https://docs.bullmq.io
