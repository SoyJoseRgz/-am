# 08 — Admin panel

**What to build:** Admin routes under `/admin/*`. Dashboard with summary counts. Full CRUD for:

**Categorías:** add/edit/delete, name, Material icon picker, drag-to-reorder.

**Platillos:** add/edit/delete (soft-delete with `activo`), name, desc, price, category selector, modifier builder, photo upload (drag-drop or click, validates max 5MB, jpg/png → WebP 85% quality, max 1200px width), "Duplicar" button (copies all fields + photo). Gallery layout with search.

**Modificadores:** add/edit/delete per platillo, name, price, max_seleccion.

**Mesas:** add/edit/delete, numero, "Descargar QR" button (generates PNG with mesa URL), table status indicator.

**Staff:** add/edit/delete, name, celular, password set/reset, role selector (mesero/cocina).

**Pedidos:** historial de pedidos con stats y items cancelados.

**Blocked by:** 04

**Estado real:** completado (8/8)
**Gaps conocidos:** Notificaciones inconsistentes entre CRUDs. Reorden con flechas ↑↓ en vez de drag-and-drop.

- [x] Categorías: list, create, edit, delete, reorder by drag
- [x] Platillos: list with search, create, edit, soft-delete, duplicate
- [x] Photo upload validates size/type, converts to WebP, stores at `/var/www/fotos/{restaurante_id}/{platillo_id}.webp`
- [x] Modificadores: list per platillo, create, edit, delete
- [x] Mesas: list with status chip, create, edit, delete, QR download
- [x] Staff: list, create, edit, delete, role assignment
- [x] Pedidos: historial con 4 cards de stats (totales, activos, completados, cancelados) + lista con items coloreados por estado + cancelados expandibles
- [ ] All CRUDs show notifications on success/error
- [x] Responsive layout (sidebar on desktop, bottom nav on mobile)

**Notas:**
- Vista unificada: `frontend/src/routes/admin/Menu.tsx` — categorías expandibles con platillos inline
- Pedidos: `frontend/src/routes/admin/Pedidos.tsx` — ruta `/admin/pedidos`
- Backend admin: `backend/src/routes/admin.ts` — CRUD completo + `GET /api/admin/pedidos`
- Model pedidos: `backend/src/models/pedido.ts` — `findForAdmin` retorna últimos 100 pedidos con items
- Fotos: validación 5MB, jpg/png, sharp convierte a WebP 1200px/quality 85
- Layout responsive: `AdminLayout.tsx` — sidebar md+, bottom nav móvil + header con logout
- Gap: `Mesas.tsx` sin notificaciones (errores a console), `Platillos.tsx` sin success msgs
- Reorden: flechas ↑↓ en vez de HTML5 drag-and-drop (API `PATCH /reorder` sí existe)
