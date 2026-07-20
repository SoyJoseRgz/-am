# 02 — Docker + infra

**What to build:** Docker Compose with services: `backend`, `frontend` (Nginx serving built assets), `postgres` (16-alpine), `redis` (7-alpine). Nginx config for reverse proxy — `/api/*` → backend, `/socket.io/*` → backend WS, `/*` → frontend assets. Let's Encrypt certbot setup in entrypoint. `Makefile` with `make dev`, `make build`, `make deploy`. Environment variable template (DB URL, Redis URL, JWT secret, upload paths, domain).

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `docker compose up` starts all 4 services without port conflicts
- [ ] Nginx proxies `GET /api/health` → backend
- [ ] WebSocket connects through Nginx at `/socket.io/`
- [ ] Static assets served at `/*` with Cache-Control headers
- [ ] HTTPS works via Let's Encrypt (or self-signed fallback for dev)
- [ ] PostgreSQL data persists across restarts (named volume)
- [ ] `.env` controls per-environment config
