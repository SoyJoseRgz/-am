# 07 — Pre-pedido → Cocina

**What to build:** Per-comensal cart: add platillos + modifiers, quantity controls (+/-), remove items. Cart shows itemized total. "Confirmar pedido" button → shows pre-pedido summary (all items grouped, mesa number, comensal name). "Enviar a cocina" → order saved as `pendiente`. Kitchen view (separate page/panel, accessible to cocina users): real-time incoming orders, plays alert sound on new order, orders grouped by mesa. Items have states: Pendiente (yellow) → Preparando (blue) → Listo (green) → Entregado (grey). Each item toggled individually. Kitchen can mark entire mesa as "Entregado" once all items done.

**Blocked by:** 06

**Status:** ready-for-agent

- [ ] Comensal adds platillos + modifiers to cart
- [ ] Cart shows itemized prices and total with IVA indicator
- [ ] Pre-pedido summary page before final confirmation
- [ ] Confirmed order appears in kitchen view within 1 second
- [ ] Kitchen plays audio alert on new order
- [ ] Each item has 4 states: Pendiente → Preparando → Listo → Entregado
- [ ] Kitchen can advance individual item states
- [ ] Comensal can cancel own items marked "Pendiente"
- [ ] Mesa header in kitchen shows comma-separated comensal names
