# Setup Instructions

## Prerequisites

- Node.js 22+
- Docker and Docker Compose
- npm

## Steps

```bash
npm install
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

## Local URLs

- API: http://localhost:3000
- Swagger: http://localhost:3000/api/docs
- PostgreSQL: localhost:5433
- Redis: localhost:6379

## Useful Commands

```bash
npm run start:dev
npm run lint
npx tsc --noEmit
npx prisma migrate deploy
```
