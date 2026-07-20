# 01 — Project scaffold

**What to build:** Set up mono-repo with `/frontend`, `/backend`, `/database`, `/shared` directories. Frontend: Vite + React + TypeScript + TailwindCSS + PWA (vite-plugin-pwa). Backend: Fastify + TypeScript + Socket.io. Database: node-pg-migrate config + connection pool. Shared: TypeScript types and Zod schemas importable from both sides. Root `package.json` with parallel dev scripts. TypeScript paths so imports like `@shared/*` work everywhere.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `npm run dev` starts both frontend (Vite) and backend (tsx watch) concurrently
- [ ] Frontend `npm run build` passes `tsc --noEmit`
- [ ] Backend starts and responds `200 OK` on `GET /health`
- [ ] Shared types (`@shared/types`) importable from both frontend and backend
- [ ] PWA manifest + service worker generated on build
- [ ] TailwindCSS compiles and applies utility classes
- [ ] `.env.example` checked in, `.env` gitignored
