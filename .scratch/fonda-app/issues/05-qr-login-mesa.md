# 05 — QR + Login + Mesa

**What to build:** QR code encodes `https://miresto.app/m/{restaurante_id}/{mesa_id}`. Route `/m/:restaurante_id/:mesa_id` parses params, validates restaurant and mesa exist, checks mesa belongs to restaurant. If user not authenticated → show login page. After login → redirect back to `/m/:restaurante_id/:mesa_id`. User enters mesa and gets a 4-digit invitation code. Second user joins by entering the restaurant+mesa URL and the 4-digit code. WebSocket room per `restaurante_id:mesa_id`. QR generation endpoint for admin (returns PNG).

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] QR encodes correct URL format
- [ ] `/m/:restaurante_id/:mesa_id` validates both exist and belong together
- [ ] Unauthenticated user redirected to `/login?redirect=/m/...`
- [ ] Authenticated user auto-joins mesa session
- [ ] First user in mesa gets 4-digit code displayed
- [ ] Second user can join with code + mesa URL
- [ ] Socket.io room `mesa:{restaurante_id}:{mesa_id}` created with all joined users
- [ ] Mesa screen shows: "Mesa N° {numero}" header, list of joined comensales
