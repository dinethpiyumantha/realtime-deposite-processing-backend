# Architecture Explanation

## Full System Diagram

```mermaid
flowchart LR
	user[User]

	subgraph frontend[Frontend]
		webapp[Web App or Admin UI]
		state[UI State and Realtime Updates]
	end

	subgraph backend[NestJS Backend]
		api[REST API Controllers]
		guard[API Key Guard]
		service[Wallet and Deposit Services]
		ws[Socket.IO Gateway]
		queue[BullMQ Queue]
		worker[Deposit Processor Worker]
		prisma[Prisma Service]
	end

	subgraph data[Infrastructure]
		postgres[(PostgreSQL)]
		redis[(Redis)]
	end

	callback[External Callback Endpoint]

	user --> webapp
	webapp -->|HTTP requests| api
	webapp -->|WebSocket subscribe| ws
	api --> guard
	guard --> service
	service --> prisma
	prisma --> postgres
	service -->|enqueue job| queue
	queue --> redis
	worker -->|consume job| queue
	worker --> prisma
	worker -->|status events| ws
	worker -->|HTTP callback| callback
	ws -->|deposit.processed or callback_failed| state
	state --> webapp
```

## Main Parts

- NestJS handles HTTP APIs and WebSocket connections.
- PostgreSQL stores wallets and transactions.
- Redis backs the BullMQ queue.
- Prisma is used for database access.

## Flow

1. A client sends a deposit request.
2. The API stores a pending transaction.
3. A BullMQ worker processes the job.
4. The system updates the transaction status.
5. A callback and WebSocket event are sent.

## Modules

- `wallets`: wallet creation and lookup
- `deposits`: deposit ingestion and processing
- `prisma`: database access
- `common`: shared guard logic
