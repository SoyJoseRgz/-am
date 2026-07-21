# 07 — Pre-pedido → Cocina

**What to build:** Per-comensal cart: add platillos + modifiers, quantity controls (+/-), remove items. Cart shows itemized total. "Confirmar pedido" button → shows pre-pedido summary (all items grouped, mesa number, comensal name). "Enviar a cocina" → order saved as `pendiente`. Kitchen view (separate page/panel, accessible to cocina users): real-time incoming orders, plays alert sound on new order, orders grouped by mesa. Items have states: Pendiente (yellow) → Preparando (blue) → Listo (green) → Entregado (grey) → Cancelado (red). Each item toggled individually. Kitchen can mark entire mesa as "Entregado" once all items done.

**Blocked by:** 06

**Estado real:** parcial (7/9)
**Gaps conocidos:** Sin alerta sonora en cocina, nombres de comensales no se muestran en cocina.

- [x] Comensal adds platillos + modifiers to cart
- [x] Cart shows itemized prices and total with IVA indicator
- [x] Pre-pedido summary page before final confirmation
- [x] Confirmed order appears in kitchen view within 1 second
- [ ] Kitchen plays audio alert on new order
- [x] Each item has 5 states: Pendiente → Preparando → Listo → Entregado → Cancelado
- [x] Kitchen can advance individual item states
- [x] Cocina can cancel items in Pendiente with motivo (bottom sheet → textarea)
- [x] Items cancelados se tachan en rojo, visibles solo en admin/pedidos
- [x] Timer muestra minutos desde creación junto al número de mesa
- [ ] Comensal can cancel own items marked "Pendiente"
- [ ] Mesa header in kitchen shows comma-separated comensal names

**Notas:**
- Cart: `frontend/src/stores/CartContext.tsx` — persiste en localStorage
- Pre-pedido: `frontend/src/routes/PrePedido.tsx` — ruta `/m/:restauranteId/:mesaId/prepedido`
- Cocina: `frontend/src/routes/Cocina.tsx` — pedidos en vivo con Socket.io
- Backend pedidos: `backend/src/routes/pedidos.ts` — POST crea orden con transacción, marca mesa ocupada
- Backend cocina: `PUT /api/cocina/pedidos/:id/items/:itemId` — avanza estado, acepta `motivo` para cancelación
- Model: `backend/src/models/pedido.ts` — query con JOINs, transacción, `updateItemEstado` con motivo opcional
- Socket.io emite `pedido:nuevo` a `room:restaurante:${id}`
- Migración 014: agrega `'cancelado'` al enum `estado_item_enum`
- Gap: backend query retorna solo `u.nombre` (primer comensal), no comma-separated
