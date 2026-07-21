# 06 — Menú digital

**What to build:** Full digital menu inside the mesa view. Categories shown as horizontal scrollable tabs at top. Active category shows its platillos in a responsive grid (1 col mobile, 2 cols tablet). Each platillo card: photo (WebP, lazy-loaded), name, description (truncated to 2 lines), price, dietary flags (vegano, sin gluten, etc.) as small colored badges. Tapping a platillo opens an expandable section with modifiers — radio buttons (select one) and checkboxes (select multiple, up to `max_seleccion`). Modifier prices shown inline. Search bar at top to filter all platillos. Backend: `GET /api/restaurantes/:id/categorias?include=platillos,modificadores`.

**Blocked by:** 05

**Estado real:** completado con gap (7.5/8)
**Gaps conocidos:** Sin blur placeholder/skeleton en carga de fotos. Sin badges dietarios (vegano, sin gluten).

- [x] Categories scrollable horizontally, active one highlighted
- [x] Platillos shown in grid with photo, name, price, badges
- [ ] Photos lazy-load with blur placeholder
- [x] Modifiers expandable: radio for single, checkbox for multi
- [x] Modifier price shown inline, added to total display
- [x] Search bar filters all platillos across categories
- [x] API returns nested data: categorias → platillos → modificadores
- [x] Images from `/fotos/{restaurante_id}/{platillo_id}.webp`

**Notas:**
- Componente: `frontend/src/routes/MenuDigital.tsx`
- Categorías horizontales con scroll snap, activa en bg-black
- Grid responsive 1 col móvil / 2 cols tablet
- Modificadores: radio si `max_seleccion===1`, checkbox si multi
- Search bar filtra por nombre/descripción, muestra flat list si hay query
- API: `GET /api/restaurantes/:id/menu` retorna `{ categorias, iva_porcentaje, iva_incluido }`
- Fotos servidas via `/fotos/` (backend static route + Nginx + Vite proxy)
- Gap menor: `loading="lazy"` sí, pero sin blur placeholder
