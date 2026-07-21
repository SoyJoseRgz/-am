# 02 — Docker + infra

**What to build:** Docker Compose with services: `backend`, `frontend` (Nginx serving built assets), `postgres` (16-alpine), `redis` (7-alpine). Nginx config for reverse proxy — `/api/*` → backend, `/socket.io/*` → backend WS, `/*` → frontend assets. Let's Encrypt certbot setup in entrypoint. `Makefile` with `make dev`, `make build`, `make deploy`. Environment variable template (DB URL, Redis URL, JWT secret, upload paths, domain).

**Blocked by:** 01

**Estado real:** completado (6/7)
**Gaps conocidos:** HTTPS/SSL no configurado en Nginx (solo scripts stub en Makefile).

- [x] `docker compose up` starts all 4 services without port conflicts
- [x] Nginx proxies `GET /api/health` → backend
- [x] WebSocket connects through Nginx at `/socket.io/`
- [x] Static assets served at `/*` with Cache-Control headers
- [ ] HTTPS works via Let's Encrypt (or self-signed fallback for dev)
- [x] PostgreSQL data persists across restarts (named volume)
- [x] `.env` controls per-environment config

**Notas:**
- 4 servicios definidos: postgres (16-alpine), redis (7-alpine), backend, frontend (Nginx)
- Ports: backend `127.0.0.1:4200:3000`, frontend `127.0.0.1:4201:80`
- Healthchecks para postgres y redis
- WebSocket upgrade configurado en Nginx
- `Makefile` con comandos `ssl-init` y `ssl-renew` pero Nginx no tiene server block SSL
- Archivos: `docker-compose.yml`, `nginx/default.conf`, `nginx/dev.conf`, `Makefile`, `scripts/init-ssl.sh`
