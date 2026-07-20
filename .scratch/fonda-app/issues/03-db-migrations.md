# 03 — DB migrations

**What to build:** `node-pg-migrate` wired into the backend startup. All 12 initial migrations creating tables with proper foreign keys (every table has `restaurante_id` for multi-tenancy):

1. `restaurantes` — id, nombre, slug, direccion, telefono, iva_porcentaje, iva_incluido, plan, activo, created_at
2. `usuarios` — id, restaurante_id, celular, password_hash, nombre, rol (super_admin/admin/cocina/mesero/comensal), force_password_change, created_at
3. `mesas` — id, restaurante_id, numero, qr_code, estado (libre/ocupada/unida/limpiando), created_at
4. `categorias` — id, restaurante_id, nombre, icono, orden, created_at
5. `platillos` — id, restaurante_id, categoria_id, nombre, descripcion, precio, foto_url, activo, created_at
6. `modificadores` — id, restaurante_id, platillo_id, nombre, precio, max_seleccion, created_at
7. `pedidos` — id, restaurante_id, mesa_id, usuario_id, estado, created_at
8. `pedido_items` — id, pedido_id, platillo_id, cantidad, precio_unitario, estado (pendiente/preparando/listo/entregado), notas, created_at
9. `pedido_item_modificadores` — id, pedido_item_id, modificador_id, created_at
10. `llamados` — id, restaurante_id, mesa_id, tipo, estado, created_at
11. `mesa_usuarios` — id, restaurante_id, mesa_id, usuario_id, codigo_invitacion, activo, created_at
12. `sessions` — id, usuario_id, refresh_token, expires_at, created_at

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] All 12 migrations run without errors
- [ ] Each table has `restaurante_id` FK with CASCADE on DELETE
- [ ] `node-pg-migrate up` creates tables, `down` drops them in reverse order
- [ ] Indexes on foreign keys and `celular` (unique per restaurante)
- [ ] Enum types for `rol`, `estado_mesa`, `estado_item` defined
