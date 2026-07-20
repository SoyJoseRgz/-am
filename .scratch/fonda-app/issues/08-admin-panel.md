# 08 — Admin panel

**What to build:** Admin routes under `/admin/*`. Dashboard with summary counts. Full CRUD for:

**Categorías:** add/edit/delete, name, Material icon picker, drag-to-reorder.

**Platillos:** add/edit/delete (soft-delete with `activo`), name, desc, price, category selector, modifier builder, photo upload (drag-drop or click, validates max 5MB, jpg/png → WebP 85% quality, max 1200px width), "Duplicar" button (copies all fields + photo). Gallery layout with search.

**Modificadores:** add/edit/delete per platillo, name, price, max_seleccion.

**Mesas:** add/edit/delete, numero, "Descargar QR" button (generates PNG with mesa URL), table status indicator.

**Staff:** add/edit/delete, name, celular, password set/reset, role selector (mesero/cocina).

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] Categorías: list, create, edit, delete, reorder by drag
- [ ] Platillos: list with search, create, edit, soft-delete, duplicate
- [ ] Photo upload validates size/type, converts to WebP, stores at `/var/www/fotos/{restaurante_id}/{platillo_id}.webp`
- [ ] Modificadores: list per platillo, create, edit, delete
- [ ] Mesas: list with status chip, create, edit, delete, QR download
- [ ] Staff: list, create, edit, delete, role assignment
- [ ] All CRUDs show notifications on success/error
- [ ] Responsive layout (sidebar on desktop, bottom nav on mobile)
