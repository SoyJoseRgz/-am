# 06 — Menú digital

**What to build:** Full digital menu inside the mesa view. Categories shown as horizontal scrollable tabs at top. Active category shows its platillos in a responsive grid (1 col mobile, 2 cols tablet). Each platillo card: photo (WebP, lazy-loaded), name, description (truncated to 2 lines), price, dietary flags (vegano, sin gluten, etc.) as small colored badges. Tapping a platillo opens an expandable section with modifiers — radio buttons (select one) and checkboxes (select multiple, up to `max_seleccion`). Modifier prices shown inline. Search bar at top to filter all platillos. Backend: `GET /api/restaurantes/:id/categorias?include=platillos,modificadores`.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] Categories scrollable horizontally, active one highlighted
- [ ] Platillos shown in grid with photo, name, price, badges
- [ ] Photos lazy-load with blur placeholder
- [ ] Modifiers expandable: radio for single, checkbox for multi
- [ ] Modifier price shown inline, added to total display
- [ ] Search bar filters all platillos across categories
- [ ] API returns nested data: categorias → platillos → modificadores
- [ ] Images from `/fotos/{restaurante_id}/{platillo_id}.webp`
