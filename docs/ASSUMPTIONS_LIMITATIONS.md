# Assumptions And Limitations

## Assumptions

- Redis and PostgreSQL are available when the app starts.
- Clients send a valid API key.
- Each deposit has a unique transaction hash.
- An external callback endpoint (configured via `CALLBACK_URL` env var) is available and responds to HTTP POST requests after deposit processing.

## Limitations

- WebSocket connections currently have no auth layer.
- CORS is open and should be restricted in production.
- Callback retry rules are simple and fixed.
- The system is focused on one deposit workflow only.