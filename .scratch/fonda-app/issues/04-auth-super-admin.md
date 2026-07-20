# 04 — Auth + Super Admin

**What to build:** JWT auth with access token (15 min) and refresh token (7 days, stored in `sessions` table). Login with celular + password, register (comensal self-registration). Password hashing with bcrypt. Password recovery via OTP sent to WhatsApp (WhaConnect — wire up endpoint, stub for MVP). Super Admin routes under `/super/*`: create restaurant, create admin user for restaurant, list restaurants with status. First admin login forces password change.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] `POST /api/auth/register` creates user with celular + password
- [ ] `POST /api/auth/login` returns `{ accessToken, refreshToken }`
- [ ] `POST /api/auth/refresh` returns new access token
- [ ] `POST /api/auth/recover` sends OTP (stubbed, logs to console)
- [ ] `POST /api/auth/reset-password` validates OTP, updates password
- [ ] Protected middleware rejects requests without valid JWT
- [ ] Super Admin can `POST /super/restaurantes` — creates restaurant + admin user
- [ ] Super Admin can `GET /super/restaurantes` — lists all
- [ ] First admin login redirects to change-password page
- [ ] Refresh tokens are invalidated on logout
