# Design Decisions

- NestJS was used for modular structure and decorators.
- Prisma was chosen for typed database access.
- BullMQ was added so deposit processing can run asynchronously.
- Socket.IO is used to push status updates in real time.
- Deposit idempotency is handled through a unique transaction hash.