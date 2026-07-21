# 04 — Auth + Super Admin

**What to build:** JWT auth with access token (15 min) and refresh token (7 days, stored in `sessions` table). Login with celular + password, register (comensal self-registration). Password hashing with bcrypt. Password recovery via OTP sent to WhatsApp (WhaConnect — wire up endpoint, stub for MVP). Super Admin routes under `/super/*`: create restaurant, create admin user for restaurant, list restaurants with status. First admin login forces password change.

**Blocked by:** 03

**Estado real:** completado con gap (10/10)
**Gaps conocidos:** OTP sigue siendo stub (solo log).

- [x] `POST /api/auth/register` creates user with celular + password
- [x] `POST /api/auth/login` returns `{ accessToken, refreshToken, usuario.force_password_change }`
- [x] `POST /api/auth/refresh` returns new access token
- [x] `POST /api/auth/recover` sends OTP (stubbed, logs to console)
- [x] `POST /api/auth/reset-password` valida OTP, actualiza password (acepta `restaurante_id` opcional)
- [x] Protected middleware rejects requests without valid JWT
- [x] Super Admin can `POST /super/restaurantes` — crea restaurante + admin con `force_password_change: true`
- [x] Super Admin can `GET /super/restaurantes` — lists all
- [x] First admin login redirects to `/cambiar-contrasena` (funciona para admin, mesero, cocina)
- [x] Refresh tokens are invalidated on logout

**Notas:**
- Backend completo: `backend/src/routes/auth.ts` (register, login, refresh, logout, recover, reset-password)
- Auth plugin: `backend/src/plugins/auth.ts` (JWT verify, role guard)
- Super admin routes: `backend/src/routes/super.ts`
- Seed: `backend/src/seed.ts` — crea super_admin `2299288981`
- `Usuario.create` ahora default `force_password_change: true` cuando `rol='admin'`
- `reset-password` busca por `restaurante_id` si se pasa, evitando ambigüedad con mismo celular
- Frontend `App.tsx` redirects a `/cambiar-contrasena` si `force_password_change: true`
- JWT con jose (no jsonwebtoken), bcrypt salt rounds 10
