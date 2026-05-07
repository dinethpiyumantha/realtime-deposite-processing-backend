# Real-time Deposit Processing Backend

> Production-ready NestJS backend for processing cryptocurrency deposits with real-time status updates, async job processing, and reliable callback mechanisms.

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Setup Instructions](./docs/SETUP.md) | Minimal local setup steps |
| [API Documentation](./docs/API.md) | Short API summary and Swagger link |
| [Architecture Explanation](./docs/ARCHITECTURE.md) | Short system overview and request flow |
| [Design Decisions](./docs/DESIGN_DECISIONS.md) | Key implementation choices |
| [Assumptions And Limitations](./docs/ASSUMPTIONS_LIMITATIONS.md) | Current constraints and expectations |

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start with Docker
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Access endpoints
# API: http://localhost:3000
# Swagger Docs: http://localhost:3000/api/docs
# WebSocket: ws://localhost:3000/deposits
```

## Features

✅ **Deposit Ingestion** - Idempotent deposit processing via unique transaction hash  
✅ **Async Processing** - BullMQ job queue with Redis backend  
✅ **Real-time Updates** - Socket.IO WebSocket for deposit status notifications  
✅ **Reliable Callbacks** - HTTP webhook callbacks with exponential backoff retries  
✅ **API Security** - API key authentication on all endpoints  
✅ **API Documentation** - Swagger UI with OpenAPI spec  
✅ **Type Safety** - Full TypeScript strict mode  
✅ **Code Quality** - ESLint + Prettier with pre-commit hooks  
✅ **Production Ready** - Multi-stage Docker build, database migrations  

## Tech Stack

- **Framework**: NestJS 11 + TypeScript 5.7
- **Database**: PostgreSQL 16 + Prisma v7
- **Queue**: BullMQ 5.76 + Redis 7
- **Real-time**: Socket.IO 4.8
- **Authentication**: API Key
- **Documentation**: Swagger/OpenAPI
- **Containerization**: Docker + Docker Compose
- **Code Quality**: ESLint 9 + Prettier 3.4 + Husky 9

## Project setup

```bash
npm install
```

## Development Commands

```bash
# Start development server with hot reload
npm run start:dev

# Build for production
npm run build

# Run linting and auto-fix
npm run lint

# Format code with Prettier
npm run format

# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Run tests with coverage
npm run test:cov
```

## Docker Setup

```bash
# Development environment with hot reload
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Production environment
docker compose up --build

# Fresh start (clear volumes)
docker compose down -v
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# View logs
docker compose logs -f app
docker compose logs -f db
docker compose logs -f redis

# Stop all services
docker compose down
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/deposit_db?schema=public
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=deposit_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# API Security
API_KEY=dev-api-key

# Webhook
CALLBACK_URL=https://example.com/webhook
```

## Testing API Endpoints

### Create Wallet

```bash
curl -X POST http://localhost:3000/wallets \
  -H "x-api-key: dev-api-key" \
  -H "Content-Type: application/json" \
  -d '{"address": "wallet-123"}'
```

### List Wallets

```bash
curl -H "x-api-key: dev-api-key" http://localhost:3000/wallets
```

### Ingest Deposit

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

## Database Management

```bash
# View database in Prisma Studio
npx prisma studio

# Create new migration
npx prisma migrate dev --name <migration_name>

# Apply pending migrations
npx prisma migrate deploy

# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# Generate Prisma client
npx prisma generate
```

## API Documentation

- **Swagger UI**: http://localhost:3000/api/docs
- **REST API Guide**: [API_ENDPOINTS.md](./API_ENDPOINTS.md)
- **WebSocket Guide**: [WEBSOCKET_REALTIME_INTEGRATION.md](./WEBSOCKET_REALTIME_INTEGRATION.md)

## Production Deployment

1. See [Setup Instructions](./docs/SETUP.md) for production checklist
2. Configure environment variables in `.env` for production
3. Build Docker image: `docker compose build`
4. Deploy to your infrastructure
5. Run migrations: `npx prisma migrate deploy`
6. Monitor application logs

## Project Structure

```
src/
├── common/              # Shared utilities
│   └── guards/          # API Key authentication
├── deposits/            # Deposit processing module
│   ├── deposits.controller.ts
│   ├── deposits.service.ts
│   ├── deposits.processor.ts    # BullMQ worker
│   ├── deposit-updates.gateway.ts # WebSocket
│   └── dto/
├── wallets/             # Wallet management module
│   ├── wallets.controller.ts
│   ├── wallets.service.ts
│   └── dto/
├── prisma/              # Database layer
│   ├── prisma.service.ts
│   └── prisma.module.ts
├── app.module.ts        # Root module
└── main.ts              # Bootstrap

prisma/
├── schema.prisma        # Data model
└── migrations/          # Migration history

docs/
├── SETUP.md             # Setup instructions
└── ARCHITECTURE.md      # System architecture
```

## Code Quality

- **ESLint**: Enforced via pre-commit hooks
- **Prettier**: Auto-formatting on staged files
- **Husky**: Git hooks for code quality
- **TypeScript**: Strict mode enabled

Run locally:

```bash
npm run lint      # Run ESLint
npm run format    # Format with Prettier
npx tsc --noEmit  # Check TypeScript
```

## Troubleshooting

### Port already in use

```bash
lsof -i :3000
lsof -i :5433
lsof -i :6379
```

### Database connection issues

```bash
# Verify services are running
docker compose ps

# Check database logs
docker compose logs db

# Restart database
docker compose restart db
```

### Fresh environment setup

```bash
docker compose down -v
rm -rf node_modules
npm install
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

## Contributing

1. Create feature branch from `develop`
2. Make changes and commit (pre-commit hooks run automatically)
3. Push to remote
4. Create pull request
5. Merge after review

## License

Proprietary - All rights reserved

