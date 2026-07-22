# Fonda App / Resto App — Reglas del Proyecto

## ¿Qué estamos construyendo?

PWA SaaS para restaurantes pequeños. Menú digital vía QR, pedidos en tiempo real a cocina,
gestión de mesas con semáforo, cuenta digital. Sin comisión por pedido — suscripción fija mensual.

**Dominio:** `miresto.app` (único, sin subdominios por restaurante)
**QR:** `/m/{restaurante_id}/{mesa_id}` — fijo, no expira, codifica ambos IDs.

## Glosario de dominio

| Término | Significado |
|---------|-----------|
| **Restaurante** | Cliente de la plataforma. Cada uno tiene su propia data aislada por `restaurante_id` |
| **Mesa** | Entidad física con QR fijo. Estados: Libre 🟢 → Ocupada 🔴 → Unida 🟡 → Limpiando 🟤 |
| **Comensal** | Cliente final que escanea QR y pide desde su celular. No instala nada (PWA) |
| **Mesero** | Staff que gestiona mesas, toma órdenes manuales, cobra |
| **Cocina** | Staff que solo ve pedidos entrantes y marca estados de items |
| **Admin** | Dueño del restaurante. CRUD menú, mesas, staff. Usa la PWA desde el celular |
| **Super Admin** | Dueño de la plataforma. Crea restaurantes y admins iniciales. Panel `/super/*` |
| **Pre-pedido** | Resumen del carrito que el comensal revisa antes de confirmar |
| **Código de invitación** | 4 dígitos que el primer comensal de una mesa genera. Los demás lo ingresan para unirse a la misma sesión |
| **Semáforo** | Dashboard del mesero con todas las mesas coloreadas por estado |
| **Modificadores** | Dos niveles: Grupo (ej: "Tortilla") → Opción (ej: "Maíz", "Harina"). Con precio y `max_seleccion` |

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React + Vite + TypeScript + TailwindCSS + PWA (vite-plugin-pwa) |
| Backend | Node.js + Fastify + TypeScript |
| DB | PostgreSQL 16 (multi-tenant con `restaurante_id` en cada tabla) |
| Cache + Tiempo real | Redis + Socket.io (rooms híbridos) |
| Auth | JWT (access 15min + refresh 7d), localStorage, bcrypt |
| Fotos | Local VPS (`/var/www/fotos/{restaurante_id}/{platillo_id}.webp`), Nginx las sirve |
| Migraciones | node-pg-migrate (timestamp, up/down, automáticas al deploy) |
| QR | Generación server-side, PNG + PDF descargables desde admin |
| WhatsApp OTP | API WhaConnect (Baileys) — el usuario ya la tiene |
| Infra | Docker Compose en VPS (4 vCPU, 8GB RAM, 100GB SSD) + Nginx + Let's Encrypt |
| CI/CD | GitHub Actions |

## Estructura del proyecto

```
/
├── frontend/               # React + Vite + TailwindCSS + PWA
│   ├── src/
│   │   ├── routes/         # /login, /mesa/, /admin/, /super/, /cocina/
│   │   ├── components/     # UI components compartidos
│   │   ├── hooks/          # Custom hooks
│   │   ├── stores/         # Estado global (Zustand o Context)
│   │   ├── services/       # API calls + Socket.io client
│   │   └── utils/          # Helpers
│   ├── public/
│   │   └── manifest.json   # PWA manifest
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
│
├── backend/                # Fastify + TypeScript + Socket.io
│   ├── src/
│   │   ├── routes/         # /api/auth/, /api/menu/, /api/pedidos/, /super/, etc.
│   │   ├── plugins/        # Fastify plugins (auth, cors, websocket)
│   │   ├── services/       # Lógica de negocio
│   │   ├── models/         # Consultas a DB
│   │   ├── sockets/        # Socket.io event handlers + rooms
│   │   └── utils/          # Helpers (JWT, hash, imagen)
│   ├── migrations/         # node-pg-migrate (timestamp-nombre.ts)
│   ├── seeds/              # Seed data (Super Admin por defecto)
│   ├── tsconfig.json
│   └── package.json
│
├── database/               # Solo schemas y scripts de BD (opcional, migraciones en backend/)
│   └── package.json
│
├── shared/                 # Tipos TypeScript + Zod schemas compartidos
│   ├── types/              # Interfaces (Restaurante, Mesa, Pedido, etc.)
│   ├── schemas/            # Validación Zod (request/response)
│   └── constants/          # Enums, config
│
├── docker-compose.yml
├── nginx/
│   └── default.conf
├── Makefile
├── AGENTS.md               # Este archivo
├── PRD.md                  # Documento de requerimientos completo
└── .scratch/fonda-app/issues/  # Tickets del MVP (01-09)
```

## Decisiones de arquitectura

### Multi-tenancy
Cada tabla tiene `restaurante_id` como FK. No hay BD separadas por cliente.
Todas las queries filtran por `restaurante_id`. No hay schemas de PostgreSQL por tenant.

### Auth
- JWT en localStorage (NO cookies)
- Access token: 15 min. Refresh token: 7 días (guardado en tabla `sessions`)
- Refresh automático al recibir 401
- Login: celular + password (bcrypt, salt rounds: 10)
- OTP solo para recuperación de contraseña (NO para login)
- Primer admin login: `force_password_change=true` → redirect a cambiar contraseña

### Rutas de la app
Una sola app React con rutas:
- `/login` — Login comensal
- `/m/:restauranteId/:mesaId` — QR redirect + login + mesa
- `/admin/*` — Panel admin
- `/super/*` — Panel super admin
- `/cocina/*` — Vista cocina
- NO hay subdominios por restaurante

### WebSocket (Socket.io)
Tres tipos de rooms:
- `room:restaurante:{id}` — Eventos globales (menú actualizado, platillo agotado)
- `room:mesa:{id}` — Eventos de pedido (nuevo item, cambio estado)
- `room:usuario:{id}` — Eventos directos (llamar mesero, notificación personal)

### Caché del menú (stale-while-revalidate)
1. Servir desde caché local (localStorage/IndexedDB) inmediatamente
2. En 2do plano: pedir versión actual al servidor
3. Backend versiona el menú en Redis (`menu_version:{restaurante_id}`)
4. Si cambió la versión → refrescar caché local
5. Admin guarda cambios → Redis incrementa versión → emite `menu_updated` al room del restaurante

### Fotos
- Upload: backend valida (max 5MB, jpg/png), convierte a WebP (quality 85, max 1200px width)
- Store: `/var/www/fotos/{restaurante_id}/{platillo_id}.webp`
- Serve: Nginx sirve directamente desde esa ruta
- Delete: al eliminar platillo, se borra su foto del disco

### IVA
- Configurable por restaurante (default 16%, rango 0-25%)
- Admin elige: precios con IVA incluido o sin IVA
- Ticket siempre muestra: subtotal, IVA (tasa + monto), total

### Roles con switch
- Un usuario puede tener múltiples roles (mesero + cocina)
- Al login, si tiene varios roles → selector
- Cambia de rol sin re-login (solo cambia la UI)
- Mesero NO puede modificar precios ni aplicar descuentos

### Estados de item en pedido
Pendiente (🟡) → Preparando (🔵) → Listo (🟢) → Entregado (⚫) → Cancelado (🔴)

Cada item se marca individualmente (no todo el pedido junto).

### Cancelación de items
- Cocina: cualquier item en Pendiente, con motivo obligatorio. Se guarda en `notas` como `CANCELADO: {motivo}`
- Comensal: solo sus propios items, solo en estado Pendiente (no implementado aún)
- Mesero: cualquier item de la mesa, solo en estado Pendiente (no implementado aún)

### Máquina de estados de mesa
```
Libre 🟢
  → Ocupada 🔴 (cuando comensal escanea QR y confirma pedido, o mesero marca manual)
    → Unida 🟡 (cuando une dos mesas para grupo grande)
    → Limpiando 🟤 (cuando mesero cobra y cierra cuenta)
      → Libre 🟢 (mesero limpia y marca libre manualmente)
```

### Onboarding de restaurante
1. Super Admin crea restaurante + admin inicial (celular + contraseña temporal)
2. WhatsApp notifica al admin con credenciales (vía WhaConnect)
3. Admin login → cambia contraseña (forzado)
4. Admin configura: menú, mesas + QR, staff

### Subscripciones (pago)
- Manual: transferencia/depósito bancario
- Super Admin activa plan manualmente
- Sin pasarela de pago en MVP

## Convenciones de código

- **TypeScript estricto** en todo (`strict: true`)
- **Sin clases** — funciones + tipos
- **Sin librerías UI** — TailwindCSS utility-first
- **Sin cookies** — JWT en localStorage
- **Sin npm workspaces** — carpetas separadas
- **Sin tests automatizados** en MVP (solo manuales)
- **Sin seed data** — cada restaurante empieza vacío
- **Comentarios no** — el código debe ser auto-documentado
- **Rutas con prefijo `/api/`** en backend (ej: `/api/auth/login`, `/api/menu/platillos`)
- **Diseño minimalista black/white** — fondos blancos, texto negro, grises para bordes/secundario, botones negros. Sin colores de acento (indigo/azul/verde). El único color permitido es rojo para errores y verde tenue para éxito.
- **Bordes finos** en cards (`.border.border-gray-200`), esquinas `.rounded-md`
- **Cerrar sesión** visible en todas las vistas (esquina superior derecha o sidebar)

## Workflow de desarrollo

- **`ponytail` (full)** — Siempre activo por defecto. Antes de escribir cualquier código, aplicar la ladder: YAGNI → ya existe en el codebase → stdlib → nativo → dependencia instalada → una línea → mínimo código. El código más vago que funciona es el correcto. Bug fix = root cause, no symptom.
- **`grill-me` antes de diseñar** — Si un requerimiento no está claro, hay tradeoffs que decidir, o falta diseño → invocar `grill-me` primero para refinar el plan. No código sin diseño claro.
- **`web-design-guidelines` después de implementar UI** — Toda UI nueva se revisa contra accesibilidad, UX, responsive y diseño visual antes de darla por terminada.
- **`diagnose` para bugs duros** — Bugs intermitentes, de performance, o cuya causa raíz no es obvia → usar diagnose.

Flujo: diseño claro? → ponytail. Diseño turbio? → grill-me → ponytail. UI nueva? → web-design-guidelines. Bug raro? → diagnose.

## Estado actual (22/Jul/2026)

| Ticket | Estado | Archivos clave |
|--------|--------|---------------|
| 01 — Project scaffold | ✅ | `frontend/`, `backend/`, configs |
| 02 — Docker + infra | ✅ | `docker-compose.yml`, `Dockerfile`s, `nginx/`, `Makefile` |
| 03 — DB migrations | ✅ | 14 migraciones en `backend/migrations/` |
| 04 — Auth + Super Admin | ✅ | `routes/auth.ts`, `routes/super.ts`, `plugins/auth.ts`, `seed.ts`, login UI |
| 05 — QR + Login + Mesa | ✅ | `routes/mesas.ts`, `routes/Mesa.tsx`, login UI |
| 06 — Menú digital | ✅ | `routes/menu.ts`, `models/menu.ts`, `routes/MenuDigital.tsx` |
| 07 — Pre-pedido → Cocina | ✅ | `routes/pedidos.ts`, `models/pedido.ts`, `sockets/index.ts`, `routes/MenuDigital.tsx`, `routes/PrePedido.tsx`, `routes/Cocina.tsx` |
| 08 — Admin panel | ✅ | `routes/admin.ts`, `models/{categoria,platillo,modificador,staff,mesa,pedido}.ts`, `routes/admin/{Menu,Mesas,Staff,Pedidos}.tsx` |
| 09 — Mesero panel | ✅ | `routes/mesero.ts`, `routes/Mesero.tsx`, `services/socket.ts` |

### Cambios recientes (22/Jul/2026)
- **Cancelación de items en Cocina** (`Cocina.tsx`, `routes/pedidos.ts`, `models/pedido.ts`): botón "Cancelar (falta ingrediente)" en bottom sheet → textarea motivo → PUT con `estado='cancelado'`. Items cancelados se tachan en rojo. Sección "Cancelados" movida a vista Admin. Timer (`ItemTimer`) muestra minutos desde creación junto al número de mesa.
- **Admin Pedidos** (`routes/admin/Pedidos.tsx`, `routes/admin.ts`, `models/pedido.ts`): nueva vista `/admin/pedidos`. 4 cards de stats (pedidos totales, items activos, completados, cancelados). Lista de pedidos con items coloreados por estado. Cancelados visibles dentro de `<details>` expandible.
- **Force password change para admin** (`models/usuario.ts`): `force_password_change` ahora default `true` cuando `rol='admin'`. Endpoint `reset-password` acepta `restaurante_id` para buscar usuario correcto.
- **Fix socket race** (`services/socket.ts`): `connectToRestaurante`/`connectToMesa` emiten `join` dentro de `socket.once('connect')` en vez de buffer, evitando pérdida del evento en React strict mode.
- **Fix SQL type inference** (`models/pedido.ts`): `CONCAT(..., $3)` → `|| $3` para que PostgreSQL infiera correctamente el tipo text de `$3`.
- **Migration 014** (`migrations/014-cancelado-estado.ts`): agrega valor `'cancelado'` al enum `estado_item_enum`.
- **Dead code cleanup**: eliminados `shared/` y `database/` directorios, `zustand`, `ioredis`, `zod` de package.json, `@shared` alias de vite.config, exports no usados (`apiUrl`, `leaveMesa`, `refreshToken`, `ModSeleccionado`, `CartItem`).
- **Cuenta con split en PedidoActivo** (`PedidoActivo.tsx`): resumen con subtotal por persona, IVA, propina (0/10/15/20%) y total. Botones de split (Individual/Iguales/Yo invito). Solo visible cuando hay 2+ comensales. IVA no se desglosa si está incluido. Botón "Pedir cuenta — $X" envía preferencia de split+tip al mesero.
- **Back button atrapado en mesa** (`Mesa.tsx`): `pushState`+`popstate` trap impide que back button saque al comensal de la mesa. Overlays usan `useSearchParams` (`?v=menu|prepedido|pedido`) — back button cierra overlay, no sale de la mesa.
- **Cuenta cerrada no borra auth** (`Mesa.tsx`): `localStorage.clear()` reemplazado por `limpiarCarrito()` que solo remueve keys `cart_*`. Tokens de sesión sobreviven.
- **Socket leave en cleanup** (`Mesa.tsx`, `socket.ts`): export `leaveMesa`/`leaveRestaurante`, emitido al desmontar Mesa. Sin listeners colgados.
- **Multi-tenancy en models** (`models/{categoria,platillo,modificador,staff,mesa}.ts`): todas las funciones `update()` y `remove()` ahora reciben `restaurante_id` y filtran en WHERE. Admin.ts pasa `restauranteId` del usuario autenticado.
- **Llamados security** (`routes/llamados.ts`): POST deriva `restaurante_id` de la mesa (no confía en body). GET y PUT requieren rol `mesero/admin/super_admin` y verifican `restaurante_id`.
- **Preferencia split/tip en Mesero** (`Mesero.tsx`): al abrir "Ver cuenta", busca el último llamado tipo `cuenta` de la mesa y pre-selecciona split + propina.
- **Rutas standalone eliminadas** (`App.tsx`): `/m/:rid/:mid/prepedido` y `/m/:rid/:mid/pedido` eliminadas. Solo existen como overlays dentro de Mesa.
- **Bug usuario_id null** (`PedidoActivo.tsx`): `|| 0` en groupBy para items creados por mesero.
- **Duplicado en MeseroKanban** (`MeseroKanban.tsx`): eliminado `connectToRestaurante` duplicado.

### Cambios recientes (21/Jul/2026)
- **Ticket 09 — Mesero panel**: Backend `routes/mesero.ts` con `GET /api/mesero/mesas`, `PUT .../estado`, unir/separar. Frontend `routes/Mesero.tsx` con semáforo de mesas coloreadas por estado, detalle en bottom sheet con acciones (ocupar, cobrar→limpiando, unir, separar, marcar libre), y sección de llamados activos con botón "Atender". Socket en vivo para cambios de estado y llamados. Ruta `/dashboard`.
- **Notas por item** (`MenuDigital.tsx`): textarea "Nota para cocina" en el detalle de cada platillo. Se guarda en `pedido_items.notas` y se muestra en PrePedido, PedidoActivo y Cocina.
- **Llamar mesero** (`Mesa.tsx`, `routes/llamados.ts`, `migrations/013-llamados-mensaje.ts`): botón en Mesa con modal de mensajes predefinidos + texto libre. Backend: `POST /api/llamados/mesa/:id`, `GET /api/llamados/restaurante/:id`, `PUT /api/llamados/:id/atender`. Emite eventos socket `llamado:nuevo`/`llamado:atendido`.
- **Pedir cuenta** (`PedidoActivo.tsx`): botón en vista de pedido activo que envía `tipo: 'cuenta'` al mesero.
- **UI en overlays flotantes** (`Mesa.tsx`): PrePedido y PedidoActivo ahora se muestran como popups con backdrop semitransparente en lugar de navegar a otra ruta. Menú fullscreen, pre-pedido y pedido como sheets (móvil) o centrados (desktop). Botón ✕ para cerrar.
- **Menú en grid 2-3 columnas** (`MenuDigital.tsx`): cards compactas con foto `aspect-[3/2]`, nombre, precio y botón +. Click → bottom sheet con foto grande, descripción, modificadores, notas, selector de cantidad y total calculado.
- **Código limpiado**: eliminados `admin/Categorias.tsx` y `admin/Platillos.tsx` (reemplazados por `Menu.tsx`). Eliminado `totalConIVA` de `CartContext` (no se usaba).

### Cambios recientes (20/Jul/2026, deploy)
- **Fix: logout ausente en vista móvil de Admin** (`AdminLayout.tsx`): el botón "Cerrar sesión" solo existía en el `<aside>` de desktop (`hidden md:flex`), así que en móvil (donde ese sidebar no se renderiza y solo queda el bottom nav de iconos) no había forma de cerrar sesión. Se agregó un `<header>` visible solo en móvil (`md:hidden`) con título + botón de cerrar sesión, igual al patrón ya usado en `CocinaPlaceholder`/`SuperPlaceholder`.

### Cambios recientes (20/Jul/2026)
- **Ticket 07 — Pre-pedido → Cocina**: Backend models for pedidos + items + modificadores with transaction. `POST /api/pedidos` creates order, sets mesa to ocupada. `GET /api/cocina/pedidos` lists active orders. `PUT /api/cocina/pedidos/:id/items/:itemId` advances item estado (pendiente→preparando→listo→entregado). Socket.io rooms for real-time updates (`room:restaurante`, `room:mesa`). Frontend: `MenuDigital.tsx` now has cart (+/- items with modifiers), floating cart button in Mesa view. `PrePedido.tsx` shows cart with IVA breakdown, confirms order. `Cocina.tsx` shows live incoming orders with 4-state item progression via clickable dots. `GET /api/restaurantes/:id/menu` now also returns `iva_porcentaje` and `iva_incluido`.
- **Vista unificada de Menú** (`Menu.tsx`): reemplaza las vistas separadas de Categorías y Platillos en el sidebar. Categorías expandibles, cada una con sus platillos adentro. Barra de acciones (↑, ↓, Editar nombre, ✕ Eliminar) visible al expandir. Cada platillo en dos líneas: nombre + precio + botón Editar negro, secundarios abajo. Search bar filtra por nombre de platillo o categoría.
- **Bug fixes**: Content-Type en DELETE sin body, duplicate platillo (concat→||), fotos dev server (`/fotos` route + vite proxy + FOTOS_DIR local), filtro `activo=true` en findByRestaurante, editId=-1 en POST platillo, CRUD modificadores (editar inline), foto preview en edición, auto-enter edit mode al crear platillo.
- **Diseño**: black/white, logout en todas las vistas.
- **Seed demo**: Super admin `2299288981 / Rodriguez010020#` (sin restaurante demo precargado)

### Frontend rutas activas
- `/` — Landing page (QR scanner + login o mesa demo)
- `/login` — Login/Registro toggle (celular+contraseña)
- `/m/:restauranteId/:mesaId` — Mesa + código invitación + comensales + overlays de menú/pre-pedido/pedido (`?v=menu|prepedido|pedido`)
- `/admin/menu` — Admin: CRUD unificado (categorías + platillos + modificadores + foto + search)
- `/admin/mesas` — Admin: CRUD mesas + QR descargable
- `/admin/pedidos` — Admin: historial de pedidos + stats + items cancelados
- `/admin/staff` — Admin: CRUD staff
- `/cocina` — Cocina: pedidos en vivo con estados de item clickeables
- `/super/restaurantes` — Super Admin: crear restaurantes + lista
- `/dashboard` — Mesero: semáforo de mesas + llamados + tomar pedido

### Backend endpoints activos
- `POST /api/auth/register` / `login` / `refresh` / `logout` / `recover` / `reset-password`
- `GET /api/health`
- `GET /api/mesas/:id?restaurante_id=X` — Info mesa + comensales
- `POST /api/mesas/:id/join` — Unirse a mesa (requiere auth)
- `GET /api/mesas/:id/qr` — QR PNG descargable
- `GET /api/restaurantes/:id/menu` — Menú completo (público), incluye `iva_porcentaje` e `iva_incluido`
- `POST /api/pedidos` — Crear pedido (auth, transaction, marca mesa ocupada)
- `GET /api/pedidos/mesa/:mesaId` — Pedidos activos de una mesa
- `GET /api/cocina/pedidos` — Pedidos activos (cocina)
- `PUT /api/cocina/pedidos/:id/items/:itemId` — Avanzar estado de item
- `POST /api/llamados/mesa/:mesaId` — Llamar mesero (restaurante_id derivado de la mesa, no del body)
- `GET /api/llamados/restaurante/:restauranteId` — Llamados activos (requiere mesero/admin/super_admin)
- `PUT /api/llamados/:id/atender` — Atender llamado (requiere mesero/admin/super_admin, verifica restaurante_id)
- `GET|POST|PUT|DELETE /api/admin/categorias[/:id]` — CRUD admin
- `GET|POST|PUT|DELETE /api/admin/platillos[/:id][/duplicate|/foto]` — CRUD admin
- `GET|POST|PUT|DELETE /api/admin/modificadores[/:id]` — CRUD admin
- `GET|POST|PUT|DELETE /api/admin/mesas[/:id]` — CRUD admin
- `GET|POST|PUT|DELETE /api/admin/staff[/:id]` — CRUD admin
- `GET /api/admin/pedidos` — Historial de pedidos para admin
- `GET /super/restaurantes` — protegido (solo super_admin)
- `POST /super/restaurantes` — protegido, crea restaurante + admin

### Puerto local
- Frontend: `:5173` (Vite dev, proxy `/api` → `:3000`)
- Backend: `:3000`
- PostgreSQL: `:5432`
- Redis: `:6379`

## Tickets MVP (orden de implementación)

| # | Ticket | Bloqueado por |
|---|--------|--------------|
| 01 | Project scaffold | — |
| 02 | Docker + infra | 01 |
| 03 | DB migrations | 01 |
| 04 | Auth + Super Admin | 03 |
| 05 | QR + Login + Mesa | 04 |
| 06 | Menú digital | 05 |
| 07 | Pre-pedido → Cocina | 06 |
| 08 | Admin panel | 04 |
| 09 | Mesero panel | 07, 08 |

### Módulos MVP
- **Módulo 1:** Menú Digital + QR (tickets 05, 06)
- **Módulo 2:** Pedidos + Cocina (ticket 07)
- **Módulo 5:** Mesero Híbrido (ticket 09) — ✅
- **Módulo 6 básico:** Admin CRUD menú (ticket 08) — ✅
- **Panel Super Admin:** ticket 04 — ✅

## Reglas críticas (no negociables)

1. Toda tabla tiene `restaurante_id` — sin excepción
2. JWT en localStorage, no cookies
3. Una sola app React, un build, un deploy
4. Fotos siempre WebP, locales, servidas por Nginx
5. Sin modificación de precios desde mesero
6. Cada item de pedido se marca individualmente
7. QR es fijo — no se regenera ni expira
8. Sin servicios pagados externos en MVP (todo corre en el VPS)
9. Sin tests automatizados en MVP
10. Pre-pedido es obligatorio — el comensal siempre revisa antes de confirmar
