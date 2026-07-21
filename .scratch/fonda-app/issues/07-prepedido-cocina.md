# 07 — Pre-pedido → Cocina

**What to build:** Per-comensal cart: add platillos + modifiers, quantity controls (+/-), remove items. Cart shows itemized total. "Confirmar pedido" button → shows pre-pedido summary (all items grouped, mesa number, comensal name). "Enviar a cocina" → order saved as `pendiente`. Kitchen view (separate page/panel, accessible to cocina users): real-time incoming orders, plays alert sound on new order, orders grouped by mesa. Items have states: Pendiente (yellow) → Preparando (blue) → Listo (green) → Entregado (grey). Each item toggled individually. Kitchen can mark entire mesa as "Entregado" once all items done.

**Blocked by:** 06

**Estado real:** parcial (6/9)
**Gaps conocidos:** Sin alerta sonora en cocina, sin cancelación de items post-orden, nombres de comensales no se muestran en cocina.

- [x] Comensal adds platillos + modifiers to cart
- [x] Cart shows itemized prices and total with IVA indicator
- [x] Pre-pedido summary page before final confirmation
- [x] Confirmed order appears in kitchen view within 1 second
- [ ] Kitchen plays audio alert on new order
- [x] Each item has 4 states: Pendiente → Preparando → Listo → Entregado
- [x] Kitchen can advance individual item states
- [ ] Comensal can cancel own items marked "Pendiente"
- [ ] Mesa header in kitchen shows comma-separated comensal names

**Notas:**
- Cart: `frontend/src/stores/CartContext.tsx` — persiste en localStorage
- Pre-pedido: `frontend/src/routes/PrePedido.tsx` — ruta `/m/:restauranteId/:mesaId/prepedido`
- Cocina: `frontend/src/routes/Cocina.tsx` — pedidos en vivo con Socket.io
- Backend pedidos: `backend/src/routes/pedidos.ts` — POST crea orden con transacción, marca mesa ocupada
- Backend cocina: `PUT /api/cocina/pedidos/:id/items/:itemId` — avanza estado
- Model: `backend/src/models/pedido.ts` — query con JOINs, transacción
- Socket.io emite `pedido:nuevo` a `room:restaurante:${id}`
- Gap: backend query retorna solo `u.nombre` (primer comensal), no comma-separated
