# 05 — QR + Login + Mesa

**What to build:** QR code encodes `https://miresto.app/m/{restaurante_id}/{mesa_id}`. Route `/m/:restaurante_id/:mesa_id` parses params, validates restaurant and mesa exist, checks mesa belongs to restaurant. If user not authenticated → show login page. After login → redirect back to `/m/:restaurante_id/:mesa_id`. User enters mesa and gets a 4-digit invitation code. Second user joins by entering the restaurant+mesa URL and the 4-digit code. WebSocket room per `restaurante_id:mesa_id`. QR generation endpoint for admin (returns PNG).

**Blocked by:** 04

**Estado real:** completado (8/8)

- [x] QR encodes correct URL format
- [x] `/m/:restaurante_id/:mesa_id` validates both exist and belong together
- [x] Unauthenticated user redirected to `/login?redirect=/m/...`
- [x] Authenticated user auto-joins mesa session
- [x] First user in mesa gets 4-digit code displayed
- [x] Second user can join with code + mesa URL
- [x] Socket.io room `mesa:{restaurante_id}:{mesa_id}` created with all joined users
- [x] Mesa screen shows: "Mesa N° {numero}" header, list of joined comensales

**Notas:**
- QR: `backend/src/routes/mesas.ts` genera PNG con `qrcode` library
- Ruta frontend: `App.tsx` `<Route path="/m/:restauranteId/:mesaId" element={<Mesa />} />`
- Código invitación: 4 dígitos generado server-side
- Socket.io: rooms `room:mesa:${restauranteId}:${mesaId}`
- Backend valida mesa pertenece a restaurante via `Mesa.findByRestauranteYNumero`
- Componente: `frontend/src/routes/Mesa.tsx`
