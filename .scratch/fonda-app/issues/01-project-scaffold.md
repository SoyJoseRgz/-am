# 01 — Project scaffold

**What to build:** Set up mono-repo with `/frontend`, `/backend`, `/database`, `/shared` directories. Frontend: Vite + React + TypeScript + TailwindCSS + PWA (vite-plugin-pwa). Backend: Fastify + TypeScript + Socket.io. Database: node-pg-migrate config + connection pool. Shared: TypeScript types and Zod schemas importable from both sides. Root `package.json` with parallel dev scripts. TypeScript paths so imports like `@shared/*` work everywhere.

**Blocked by:** None — can start immediately

**Estado real:** completado (6/7)
**Gaps conocidos:** `shared/types/` y `shared/schemas/` están vacíos — los tipos se definen inline en frontend y backend.

- [x] `npm run dev` starts both frontend (Vite) and backend (tsx watch) concurrently
- [x] Frontend `npm run build` passes `tsc --noEmit`
- [x] Backend starts and responds `200 OK` on `GET /health`
- [ ] Shared types (`@shared/types`) importable from both frontend and backend
- [x] PWA manifest + service worker generated on build
- [x] TailwindCSS compiles and applies utility classes
- [x] `.env.example` checked in, `.env` gitignored

**Notas:**
- `@shared` path alias configurado en frontend y backend
- `shared/constants/index.ts` tiene enums (ROLES, ESTADOS_MESA, ESTADOS_ITEM)
- `shared/types/` y `shared/schemas/` existen pero sin archivos .ts
- Backend models definen interfaces inline propias
