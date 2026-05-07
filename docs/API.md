# API Documentation

## Base URL

`http://localhost:3000`

## Auth

Send `x-api-key` in every HTTP request.

## Endpoints

- `POST /wallets` creates a wallet.
- `GET /wallets` lists wallets.
- `GET /wallets/:address` returns one wallet with transactions.
- `POST /deposits` creates a deposit request.

## Swagger

Interactive API docs are available at `http://localhost:3000/api/docs`.