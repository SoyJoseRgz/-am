# PRD: Fonda App / Resto App

## 1. Executive Summary

**Problem Statement:** Los restaurantes pequeños y fondas (1-10 mesas) aún operan con libreta y lápiz, lo que genera errores en comandas, tiempos muertos para los comensales y pérdida de control sobre las mesas y la cuenta. Las soluciones existentes (Didi/Uber Eats) cobran comisiones del 30%, y los sistemas de punto de venta tradicionales son caros y complejos.

**Proposed Solution:** Una PWA SaaS para restaurantes que permite menú digital vía QR, pedidos en tiempo real a cocina, gestión de mesas con semáforo y cuenta digital. Sin instalación para el comensal (escanea QR y pide), con cero comisión por pedido. El restaurante paga una suscripción fija mensual.

**Success Criteria:**
- Tiempo desde que el comensal escanea QR hasta que ve login: < 1s (PWA cacheada)
- Tiempo de autenticación (login con contraseña): < 2s
- Menú visible en < 1s post-login (con cache híbrido)
- Tiempo desde confirmación de pedido hasta cocina: < 1s
- Reducción de errores en comandas vs. libreta: >= 90%
- Zero downtime en horas pico (findes de semana 8pm-10pm)
- Onboarding de un restaurante nuevo: < 30 minutos
- Tiempo desde que el comensal confirma pedido hasta que llega a cocina: < 1s
- Reducción de errores en comandas vs. libreta: >= 90%
- Zero downtime en horas pico (findes de semana 8pm-10pm)
- Onboarding de un restaurante nuevo: < 30 minutos (cargar menú + imprimir QRs fijos)

**Non-Goals (v1.0):**
- Pasarela de pago digital (solo efectivo por ahora)
- CRM completo / historial de clientes (post-MVP)
- Reservas con anticipación (post-MVP)
- App nativa (solo PWA)
- Delivery / domicilios
- Multi-idioma (solo español MVP)
- Backup automático (MVP, se hará dump manual si es necesario)

---

## 2. User Experience & Functionality

### User Personas

- **Comensal:** Persona que llega al restaurante, escanea el QR de la mesa y pide desde su celular. No quiere instalar nada.
- **Cocina:** Recibe los pedidos en una tablet/pantalla. Confirma recepción, marca estados. Filtra por mesa (solo número, sin nombre).
- **Mesero:** Gestiona mesas (semáforo), toma orden manual para quienes no usan celular, lleva cuentas, cobra en efectivo. Perfil separado de cocina.
- **Encargado/Gerente:** Ve el semáforo general, alertas configurables, reportes completos.
- **Admin (dueño del restaurante):** Configura el menú, meseros, zonas, promociones, reportes. Todo desde PWA. Autónomo tras el onboarding.
- **Super Admin (dueño de la plataforma):** Crea restaurantes y sus admins iniciales. Ve el estado de todos los restaurantes. Activa/desactiva cuentas. Panel separado.

### User Stories

#### Módulo 1: Menú Digital + QR

- **Como comensal,** quiero escanear un QR fijo (genérico, sin logo) por mesa y ver el menú, para poder elegir qué pedir.
  - *AC:* QR escaneable con cualquier cámara. Menú se carga con stale-while-revalidate (cache local + refresco en 2do plano). Sin registro obligatorio (solo celular al primer pedido). El QR no cambia aunque la mesa esté ocupada — si hay sesión activa, se necesita el código de invitación para unirse.
- **Como comensal,** quiero ver fotos (recomendadas pero no obligatorias) y descripciones de los platillos, para decidir mejor.
  - *AC:* Cada platillo puede tener foto. Si no tiene, se muestra solo texto. Placeholder visual si el admin no subió foto.
- **Como comensal,** quiero ver platillos agotados pero señalados como no disponibles, para saber que existen pero no pedirlos.
  - *AC:* Items con `agotado=true` se muestran deshabilitados con texto "Agotado".
- **Como admin,** quiero crear categorías libremente (ninguna predefinida), para adaptar el menú a mi restaurante.
  - *AC:* CRUD de categorías. El admin crea, edita, reordena y elimina. Sin categorías fijas.
- **Como admin,** quiero configurar menús por horario, para mostrar desayuno en la mañana y cena en la noche.
  - *AC:* Programación por día y rango horario. Solo se muestra el menú activo según hora actual.
- **Como comensal,** quiero agregar modificaciones de dos niveles (grupo → opción) y notas a mi platillo, para personalizar mi pedido.
  - *AC:* Modificadores en dos niveles: Grupo (ej: "Tortilla") → Opciones (ej: [Maíz, Harina]). El admin crea los grupos y opciones por platillo. Notas de texto libre. Ad-ons con precio extra.

#### Módulo 2: Pedidos + Cocina en Tiempo Real

- **Como comensal,** quiero hacer un pre-pedido, revisarlo y confirmarlo, para asegurarme que está correcto antes de enviarlo a cocina.
  - *AC:* Flujo: seleccionar items → ver resumen del pedido → confirmar → va directo a cocina. El mesero no interviene.
- **Como mesero,** quiero tomar la orden manualmente y confirmarla, para que pase a cocina cuando yo decida.
  - *AC:* El mesero arma el pedido, decide el momento de confirmar, y al hacerlo pasa a cocina.
- **Como comensal,** quiero ver el tiempo estimado de preparación después de enviar mi pedido, para saber cuánto esperar.
  - *AC:* Tiempo base manual configurado por el admin por platillo. Se muestra al confirmar el pedido. Sin ajuste automático.
- **Como comensal,** quiero saber el estado de mi pedido en tiempo real: Pendiente → En proceso → Entregado.
  - *AC:* Estados visibles en la PWA. Notificación push + sonido local en cada cambio (en iOS solo sonido local + pantalla).
- **Como comensal,** quiero que cada persona en la mesa pueda pedir por separado con su propio celular, usando un código de invitación al escanear el QR, para unirme al grupo de la mesa y pedir individualmente.
  - *AC:* El primero que escanea el QR crea la sesión de mesa y obtiene un código de invitación. Los demás escanean el mismo QR e ingresan el código para unirse. Cada comensal se identifica con su celular. Los items se agrupan por usuario dentro del mismo pedido de mesa.
- **Como comensal,** quiero sumar más platillos a mi pedido activo, sin generar una cuenta nueva.
  - *AC:* Botón "Sumar a mi pedido". Se acumula al mismo pedido de mesa.
- **Como comensal,** quiero cancelar mis propios items solo si están pendientes, para corregir errores sin molestar al mesero.
  - *AC:* Cada comensal puede cancelar solo sus items, solo en estado "Pendiente". Una vez "En proceso" no se puede cancelar.
- **Como mesero,** quiero cancelar cualquier item de la mesa que esté pendiente, para resolver situaciones del cliente o errores.
  - *AC:* El mesero puede cancelar items de cualquier comensal de la mesa, solo en estado "Pendiente".
- **Como cocina,** quiero ver los pedidos entrantes en una pantalla digital (sin impresión de comandas), ordenados y filtrables por mesa, con alerta sonora al llegar uno nuevo, para no perder ninguno.
  - *AC:* Vista de cocina con perfil separado del mesero. Solo pantalla digital, sin impresora. Muestra solo número de mesa. Alerta sonora (beep) + actualización visual al recibir pedido nuevo.
- **Como cocina,** quiero marcar el estado de cada item individualmente (no todo el pedido junto), para señalar platillos listos mientras otros siguen en proceso.
  - *AC:* Estados por item: pendiente → proceso → entregado. Cada platillo se marca independientemente. La mesa ve el estado de cada item en su pantalla.
- **Como comensal,** quiero poder llamar al mesero desde la app (cuenta, servilletas, etc.), sin tener que alzar la voz.
  - *AC:* Botones "Pide cuenta", "Necesito al mesero", "Más servilletas/salsa". Llegan como notificación al mesero asignado a la zona.

#### Módulo 3: Mesas + Semáforo + Zonas

- **Como mesero,** quiero ver un semáforo de todas mis mesas (solo staff), para saber al instante cuáles están libres, ocupadas o unidas.
  - *AC:* Semáforo: Libre 🟢 / Ocupada 🔴 / Unida 🟡 / Limpiando 🟤. Estados: Libre → Ocupada (al pedir o mesero marca) → Pagaron → Limpiando → Libre. Alerta sonora al cambiar a Limpiando. Vista por zona. WebSocket.
- **Como mesero,** quiero unir dos mesas para grupos grandes, y separarlas en cualquier momento, para compartir o dividir cuentas flexiblemente.
  - *AC:* Unión y separación en cualquier momento. Los items se reasignan entre mesas al separar.
- **Como mesero,** quiero marcado híbrido de mesas (automático por QR o manual), para cubrir casos donde el comensal no usa QR.
  - *AC:* Si comensal escanea QR y confirma pedido, la mesa se marca ocupada. Si mesero toma orden manual, él la marca.
- **Como encargado,** quiero asignar zonas a meseros por horario, para cubrir todo el restaurante sin solapamientos.
  - *AC:* Configuración por horario. Transferencia de mesa entre meseros. Migración de pedido entre mesas.
- **Como encargado,** quiero alertas configurables si una mesa lleva X minutos sin pedir o esperando cuenta, para intervenir.
  - *AC:* Tiempos configurables por restaurante. Alerta al mesero + encargado vía push + sonido.

#### Módulo 4: Cuenta + Pago

- **Como comensal,** quiero pedir la cuenta desde mi celular, para avisarle al mesero sin esperar.
  - *AC:* Botón "Pedir cuenta". Llega notificación al mesero. El mesero tiene la última palabra para cerrar la cuenta.
- **Como mesero,** quiero generar la cuenta desde mi tablet, para cuando el comensal me lo pide en persona.
  - *AC:* El mesero puede iniciar el cierre de cuenta desde su vista.
- **Como comensal,** quiero ver mi ticket digital con IVA desglosado, para saber exactamente qué pagué.
  - *AC:* Ticket con desglose por ítem, subtotal, IVA, total.
- **Como comensal,** quiero dividir la cuenta: por persona (paga lo que pidió), partes iguales, o "yo invito" (uno paga todo).
  - *AC:* Las tres opciones disponibles. Ticket individual por cada método.
- **Como comensal,** quiero agregar propina antes de pagar (10%, 15%, 20% o monto libre), para dejar propina sin efectivo.
  - *AC:* Propina se elige al revisar la cuenta, se suma al total, y el mesero cobra ese total.
- **Como comensal,** quiero pedir "para llevar" desde la mesa, para llevar comida a casa.
  - *AC:* Opción "Para llevar". Costo de empaque configurable por restaurante (puede ser $0).
- **Como mesero,** quiero marcar una deuda cuando un cliente se va sin pagar, para dar seguimiento.
  - *AC:* Marcado de deuda asociado al celular del cliente. Alerta en próxima visita.

#### Módulo 5: Mesero Híbrido (Perfil Separado de Cocina)

- **Como mesero,** quiero un perfil separado del de cocina, con vista de semáforo, mesas y cuentas, para hacer mi trabajo sin distracciones.
  - *AC:* Perfil mesero: ve mesas, toma órdenes, gestiona cuentas. No ve la vista de cocina.
- **Como cocina,** quiero un perfil separado que solo muestre pedidos entrantes y su estado, para concentrarme en preparar.
  - *AC:* Perfil cocina: solo pedidos con filtro por mesa. Sin acceso a mesas, cuentas ni admin.
- **Como staff,** quiero que un mismo usuario pueda tener ambos roles asignados, para cambiar entre mesero y cocina según necesidad.
  - *AC:* El admin asigna roles al usuario. Si tiene ambos, puede cambiar de vista.
- **Como mesero,** quiero ver el menú visual con fotos igual que el comensal al tomar una orden manual, para encontrar platillos rápido.
  - *AC:* Interfaz tipo menú con fotos pequeñas, misma experiencia que el comensal. Búsqueda por nombre también disponible.
- **Como mesero,** quiero ver el total acumulado de cada mesa asignada en todo momento, para informar al comensal si pregunta.
  - *AC:* En la vista de mesas, cada mesa muestra su subtotal y total actualizados en tiempo real.
- **Como mesero,** quiero tomar órdenes manualmente desde mi tablet, para atender a comensales sin celular.
  - *AC:* Mismo flujo que el comensal pero iniciado por mesero. Confirmación manual antes de enviar a cocina.
- **Como staff con ambos roles (mesero + cocina),** quiero cambiar de un modo a otro (un rol a la vez), sin tener split screen.
  - *AC:* Selector de rol activo. Al cambiar, la interfaz se adapta completamente al rol seleccionado.
- **Como mesero,** quiero NO modificar precios ni aplicar descuentos, para evitar errores o abusos.
  - *AC:* Cero permisos de modificación de precios desde la tablet del mesero. Solo el admin puede.

#### Módulo 6: Administración (PWA)

- **Como admin,** quiero gestionar el menú desde mi celular (PWA responsive), para mantenerlo actualizado sin necesidad de laptop.
  - *AC:* Panel PWA diseñado para pantalla de celular. CRUD completo de platillos con campos: nombre, precio, categoría (libre), foto (opcional, subida al VPS, max 5MB, jpg/png, convertida a webp), tiempo base de preparación.
- **Como admin,** quiero duplicar un platillo existente para crear variantes rápido, sin tener que llenar todo desde cero.
  - *AC:* Botón "Duplicar" que clona el platillo con todos sus campos (nombre, precio, categoría, foto, tiempo, modificadores). El admin solo edita lo que cambia.
- **Como admin,** quiero gestionar modificadores y ad-ons por platillo.
  - *AC:* Modificadores de dos niveles (grupo → opciones) con precio extra. Ad-ons independientes.
- **Como admin,** quiero marcar platillos como agotados, reflejándose al instante en el menú del comensal.
  - *AC:* Botón "Agotado". Se refleja vía WebSocket en todos los dispositivos.
- **Como admin,** quiero crear promociones (2x1, happy hour, % descuento).
  - *AC:* Promociones por tipo. Programación por días y horarios. Platillos aplicables.
- **Como admin,** quiero ver reportes completos desde el inicio: ventas diarias/semanales/mensuales, ticket promedio, platillos más vendidos, horas pico, ventas por mesero.
  - *AC:* Reportes con filtros por fecha. Exportación. Métricas clave visibles en dashboard.
- **Como admin,** quiero configurar zonas y horarios de meseros, con validación de solapamientos.
  - *AC:* CRUD de zonas. Asignación de meseros con horarios. Validación de solapamientos.

---

## 3. AI System Requirements

No aplica. Tiempo de preparación base manual configurado por el admin. Sin machine learning.

---

## 4. Technical Specifications

### Architecture Overview

```
[Comensal PWA] ──WebSocket──┐
                             ├── [API Gateway (Node.js/Fastify)] ── [PostgreSQL]
[Mesero Tablet PWA] ────────┘                                         │
                             │                                   [Redis]
[Admin Panel PWA] ── REST ───┘                                   (sesiones,
                                                                  tiempo real,
[Cocina PWA] ──WebSocket────┘                                    cache menú)
                                        ┌─────────────────────────┐
                                        │  VPS Local Storage      │
                                        │  /var/www/fotos/        │
                                        │  (fotos platillos)      │
                                        └─────────────────────────┘

[Firebase Cloud Messaging]
(notificaciones push + sonido local)
```

### QR y Enrutamiento

- **URL del QR:** `miresto.app/m/{restaurante_id}/{mesa_id}` (ej: `miresto.app/m/5/2`)
- **Generación:** El panel admin genera QR con esta URL codificada. QR fijo, no expira, no se regenera
- **Ruteo en PWA:** El frontend parsea la URL, identifica restaurante + mesa, y muestra login
- **Carga del Menú (Híbrido):**
  - **Stale-while-revalidate:** El menú se sirve inmediatamente desde cache (localStorage/IndexedDB). En segundo plano se pide la versión actualizada al servidor.
  - Si no hay cache (primera vez), se carga del servidor y se guarda en cache.

### Pantallas del MVP por Rol

**Comensal:**
1. `/` — Landing page con botón "Escanear QR" (cámara trasera) + login/mesa demo
2. `/login` — Login/Registro toggle con celular + contraseña (nombre opcional, default "Comensal")
3. `/m/{restauranteId}/{mesaId}` — Mesa + código de invitación (siempre visible) + lista de comensales + botones "Ver menú" y "Ver mi pedido" (si hay pedido activo)
4. `/m/{restauranteId}/{mesaId}/prepedido` — Pre-pedido agrupado por comensal con IVA + controles +/−. Cada quien edita solo sus items. Al confirmar → redirige a pedido activo
5. `/m/{restauranteId}/{mesaId}/pedido` — Pedido activo: items agrupados por estado (pendiente/preparando/listo/entregado) con nombre del comensal. Updates en tiempo real vía socket. Botón "Sumar más"
6. `/m/{restauranteId}/{mesaId}/llamar` — Botones flotantes (cuenta, mesero, servilletas)

**Mesero:**
1. `/login` — Login + selector de rol (si tiene varios roles)
2. `/dashboard` — Semáforo de mesas (estado + total acumulado)
3. `/mesa/{id}` — Detalle de pedidos y comensales de la mesa
4. `/mesa/{id}/orden` — Toma de orden manual (menú visual + carrito)
5. `/mesa/{id}/cuenta` — Gestión de cuenta (cerrar, dividir, pagado)

**Cocina:**
1. `/login` — Login
2. `/pedidos` — Pedidos entrantes ordenados, filtrables por mesa. Alerta sonora
3. `/mesa/{id}` — Items de la mesa con checkboxes para cambiar estados

**Admin:**
1. `/login` — Login
2. `/dashboard` — Resumen rápido
3. `/menu` — CRUD categorías + platillos (con duplicar)
4. `/mesas` — CRUD mesas (crear, numerar, descargar QR)
5. `/staff` — CRUD meseros (nombre, rol, zona)

**Super Admin:**
1. `/super/login` — Login separado
2. `/super/restaurantes` — Lista de restaurantes con estado/plan
3. `/super/restaurantes/nuevo` — Crear restaurante + admin inicial
4. `/super/restaurantes/{id}` — Ver detalle, activar/desactivar

### Stack Definitivo

| Capa | Tecnología | Justificación |
|------|-----------|--------------|
| Frontend (PWA) | React + Vite + PWA manifest + TailwindCSS | Rápido, moderno, instalable sin tienda. TypeScript en todo el proyecto |
| Backend | Node.js + Fastify + TypeScript | Mismo lenguaje que frontend, alto rendimiento, tipado seguro |
| DB principal | PostgreSQL (multi-tenant con `restaurante_id` en cada tabla) | Datos estructurados, transacciones, escalable |
| Cache + sesiones + tiempo real | Redis | WebSocket rooms, sesiones, caché del menú con versionado |
| Tiempo real (app) | Socket.io con rooms híbridos | Rooms por restaurante (eventos globales) + rooms por mesa (pedidos) + rooms por usuario (notificaciones directas) |
| Notificaciones push | Firebase Cloud Messaging | Android push. iOS: sonido local + pantalla como fallback |
| WhatsApp OTP | API WhaConnect (Baileys) | El usuario ya tiene su propia implementación con Baileys |
| Fotos | Local en VPS (`/var/www/fotos/`) servido por Nginx | El frontend envía al backend, backend valida (max 5MB, jpg/png), convierte a webp (calidad 85, redimensiona a 1200px ancho máx) y guarda en disco. Nginx sirve las imágenes directamente. Fotos sin pérdida de calidad visible |
| QR | Generación server-side: PDF (impresión completa) + PNG (individual) | Ambos formatos descargables desde el panel admin |
| Hosting | VPS actual (4 vCPU / 8GB RAM / 100GB SSD) en Docker Compose | Suficiente para 50-100 restaurantes |
| Reverse proxy | Nginx con HTTPS (Let's Encrypt) | SSL, balanceo, compresión. Obligatorio para PWA (Service Workers) |
| CI/CD | GitHub Actions | Build + test + deploy automático al VPS |
| Autenticación | JWT (Bearer token) + refresh token | Access token: 15 min. Refresh token: 7 días. Renovación automática. Sin cookies |
| Proyecto | `/frontend`, `/backend`, `/database`, `/shared` | Carpetas separadas sin npm workspaces |
| Testing MVP | Manual | Sin tests automatizados en MVP |
| Seed data | Vacío | Cada restaurante empieza sin mesas, categorías ni platillos. El admin crea todo |
| Fotos en disco | `/var/www/fotos/{restaurante_id}/{platillo_id}.webp` | Organizado por restaurante y platillo. Se borra la foto al eliminar el platillo |
| Dominio | Único (`miresto.app`), el QR codifica restaurante_id + mesa_id | Sin wildcard ni subdominios. Una ruta como `/mesa/:restauranteId/:mesaId` |
| Estructura | Mono-repo (frontend + backend) | npm workspaces, deploys coordinados |
| PWAs | Una sola app React con rutas (`/comensal/*`, `/mesero/*`, `/cocina/*`, `/admin/*`, `/super-admin/*`) | Código compartido, un solo build, un solo deploy |
| Migraciones BD | `node-pg-migrate` | Migraciones versionadas (timestamp), up/down transaccional, automáticas al deploy |

### Arquitectura de WebSocket (Rooms Híbridos)

```
Socket.IO Server
│
├── room:restaurante:{id}        ← Eventos globales (menú actualizado,
│                                   platillo agotado, promoción nueva)
│                                   → Suscritos: todos los dispositivos del restaurante
│
├── room:mesa:{id}               ← Eventos de pedido (nuevo item,
│                                   cambio de estado, confirmación cocina)
│                                   → Suscritos: cocina, meseros asignados, comensales de esa mesa
│
└── room:usuario:{id}            ← Eventos directos (llamado de mesero,
                                    alerta de deuda, notificación personal)
                                    → Suscrito: el usuario específico
```

### Invalidación de Menú en Tiempo Real

1. Admin guarda cambios en el menú (nuevo platillo, precio, agotado, etc.)
2. Backend incrementa `menu_version:{restaurante_id}` en Redis
3. Backend emite `menu_updated { version, restaurante_id }` al room del restaurante
4. Todos los dispositivos del restaurante reciben el evento
5. Cada dispositivo compara su `version` local con la nueva
6. Si es diferente, refresca el menú en segundo plano
7. Si un dispositivo estaba offline, al reconectarse pide la versión actual y refresca si quedó obsoleta

### Data Model (simplificado, multi-tenant con restaurante_id)

```
RESTAURANTE
├── id, nombre, dirección, RFC, plan_suscripcion
├── configuración: horarios, zonas, propina_default,
│   alertas: { mesa_sin_pedir_min: 15, cuenta_esperando_min: 10 }
│
├── MESAS
│   ├── id, número (único por restaurante), zona_id, capacidad
│   ├── qr_token: string (fijo, codifica restaurante_id + mesa_id)
│   ├── estado: libre | ocupada | unida
│   ├── pedido_activo_id
│   └── mesero_asignado_id
│
├── MESAS_UNIDAS
│   ├── grupo_unido_id
│   └── mesa_id
│
├── USUARIOS (clientes)
│   ├── id, celular (único), nombre, contraseña_hash
│   ├── whatsapp_validado: boolean
│   ├── deuda_actual: decimal
│   └── favoritos: [platillo_id]
│
├── PEDIDOS (por mesa)
│   ├── id, mesa_id, restaurante_id
│   ├── estado_general: activo | cerrado | cancelado
│   ├── items: [{
│   │     id, platillo_id, usuario_id, cantidad,
│   │     modificaciones, notas, ad_ons,
│   │     estado_item: pendiente | proceso | entregado,
│   │     precio_unitario, subtotal
│   │   }]
│   └── total: decimal
│
├── PLATILLOS
│   ├── id, nombre, descripción, precio, foto_url
│   ├── categoria_id, disponible, agotado
│   ├── tiempo_preparacion_base: minutos
│   ├── modificadores: [{nombre, opciones, precio_extra}]
│   ├── ad_ons: [{nombre, precio}]
│   └── horarios: [{dia, hora_inicio, hora_fin}]
│
├── MESEROS (staff)
│   ├── id, nombre, celular, contraseña_hash
│   ├── roles: [mesero | cocina | admin]  (un usuario puede tener varios)
│   ├── zonas_asignadas: [{zona_id, hora_inicio, hora_fin}]
│   └── activo: boolean
│
└── PROMOCIONES
    ├── id, nombre, tipo: 2x1 | % descuento | monto_fijo
    ├── valor, platillos_aplicables
    ├── dias_aplicables, hora_inicio, hora_fin
    └── activo: boolean
```

### Flujos Clave

#### Flujo A: Comensal escanea QR, login, se une a la mesa, pre-pedido y confirmación
1. Comensal 1 escanea QR de Mesa 5 (QR fijo, contiene `restaurante_id + mesa_id`). Puede escanear con la cámara nativa de su teléfono o con el botón "Escanear QR" de la app (abre cámara trasera, parsea la URL y navega a la mesa)
2. PWA carga el login desde cache local (< 1s). Si ya tiene sesión, va directo a la mesa
3. Login con celular + contraseña, o **registro** con solo celular + contraseña (nombre opcional, default "Comensal"). Toggle en misma página. JWT devuelto
4. El backend verifica si la mesa ya tiene sesión activa:
   - No → Crea sesión, genera **código de invitación de 4 dígitos**, muestra código
   - Sí → Pide código de invitación para unirse
5. Comensales 2, 3... escanean el mismo QR, hacen login, ingresan el código de invitación → se unen a la mesa
6. Cada comensal presiona **"Ver menú"** (botón en la vista de mesa) que abre el menú en pantalla completa con botón ← Volver. Cada platillo tiene control `+` / `−/qty/+` si ya está en carrito. Sin modificadores: agrega directo. Con modificadores: expande selector + "Agregar". Cada quien agrega items a su **carrito individual** (etiquetado con su usuarioId/usuarioNombre). El menú se carga con stale-while-revalidate. El carrito flotante "Ver pedido" está disponible dentro del menú fullscreen
7. Al entrar al **pre-pedido**, los items se muestran **agrupados por comensal** (ej: "Lalo: 2 tacos, Luis: 3 cafés") con subtotal, IVA y total. Cada quien solo puede editar/eliminar sus propios items
8. Al confirmar, redirige automáticamente a **PedidoActivo** (`/m/{id}/{mesa}/pedido`) donde los items se ven agrupados por estado: Pendiente 🟡 → Preparando 🔵 → Listo 🟢 → Entregado ⚫. Updates en vivo vía socket. Un botón "Sumar más" permite volver al menú para agregar más items
9. Cocina ve los items agrupados por mesa (solo número de mesa) en pantalla digital. Alerta sonora al recibir
10. Cocina confirma recepción → items pasan a "En proceso" → notificación push + sonido a cada comensal
11. Cocina marca items individualmente como "Entregado" → notificación + sonido
12. Cualquier comensal puede "Sumar a mi pedido" o cancelar sus items pendientes en cualquier momento. Mesero también puede cancelar items de la mesa
13. Un comensal pide la cuenta desde la app → notificación al mesero
14. Cada comensal ve su ticket individual, elige propina (10/15/20% o libre), elige método de pago
15. Mesero cobra en efectivo el total consolidado → marca pagado → mesa pasa a estado **Limpiando 🟤**
16. Mesero limpia y marca **Libre 🟢** manualmente

#### Flujo B: Mesero toma orden manual
1. Mesero inicia sesión en su perfil (vista de semáforo, no cocina)
2. Ve Mesa 3 libre, marca ocupada manualmente
3. Toma orden del comensal en su tablet
4. Confirma la orden → va a cocina (mismo flujo que comensal)
5. Resto del flujo igual

#### Flujo C: Separación de mesas unidas
1. Mesas 1 y 2 están unidas (🟡), comparten pedido
2. Un grupo se quiere separar → mesero separa las mesas
3. Items se reasignan: los del Grupo A van a Mesa 1, los del Grupo B a Mesa 2
4. Cada mesa sigue su flujo de cuenta independiente

#### Flujo D: Deuda de cliente
1. Cliente se va sin pagar
2. Mesero marca mesa como "Deuda", asociada al celular del cliente
3. Próxima vez que ese celular escanea QR en cualquier mesa: alerta al mesero
4. Cliente puede pagar la deuda en efectivo en la próxima visita

### IVA (Configurable por Restaurante)

- **Tasa por defecto:** 16% (México)
- **Rango permitido:** 0% – 25%
- **Visualización de precios:** Configurable por restaurante: el admin elige si escribe precios **con IVA incluido** o **sin IVA**. El sistema calcula el desglose automáticamente según la configuración.
- **Ticket:** Siempre muestra: subtotal, IVA (con tasa y monto), total.

### Panel Super Admin (Dueño de la Plataforma)

Se agrega un nuevo perfil: **Super Admin** (tú). Es un panel separado del de los restaurantes, solo para gestionar la plataforma.

**User Stories:**

- **Como Super Admin,** quiero un panel protegido (solo para mí), para gestionar todos los restaurantes desde un solo lugar.
  - *AC:* Login separado del panel de restaurantes. Acceso solo con credenciales del dueño de la plataforma.
- **Como Super Admin,** quiero crear un nuevo restaurante con nombre, RFC, dominio y plan, para darlo de alta en la plataforma.
  - *AC:* Formulario: nombre del restaurante, RFC, dominio (ej: `tacoselbarrio.miresto.app`), plan (Fonda/Restaurante/Grande/Cadena). Al guardar, se crea el restaurante en BD.
- **Como Super Admin,** quiero crear el primer usuario admin del restaurante (celular + contraseña temporal), para que el dueño pueda iniciar sesión y configurar todo.
  - *AC:* Dentro del restaurante creado, formulario para crear admin: celular, nombre, contraseña temporal. El sistema envía un WhatsApp automático (vía WhaConnect) al celular del admin con sus credenciales. Al primer login, el admin debe cambiar la contraseña obligatoriamente.
- **Como Super Admin,** quiero ver la lista de todos los restaurantes con su estado (activo/inactivo), plan y fecha de creación, para tener visibilidad.
  - *AC:* Tabla con restaurantes, filtros por estado y plan. Ver detalles de cada uno.
- **Como Super Admin,** quiero desactivar un restaurante si deja de pagar, para bloquear su acceso.
  - *AC:* Botón desactivar/reactivar. Al desactivar, los PWAs del restaurante muestran mensaje "Cuenta suspendida".
- **Como admin del restaurante,** quiero configurar mi menú, mesas, meseros y promociones sin intervención del Super Admin, para ser autónomo.
  - *AC:* El admin del restaurante tiene acceso completo al panel PWA de administración (Módulo 6). El Super Admin solo crea el restaurante y el primer admin.

**Flujo de onboarding completo:**
1. Super Admin crea restaurante + admin inicial desde su panel
2. Admin del restaurante recibe credenciales por WhatsApp
3. Admin inicia sesión en `[dominio].miresto.app/admin`
4. Admin configura: menú (categorías, platillos, fotos, precios), mesas (número, zona, QR), meseros (nombre, rol, zona)
5. Restaurante imprime QRs y los coloca en las mesas
6. Comensales escanean y piden

### Migraciones de Base de Datos

- **Herramienta:** `node-pg-migrate` (migraciones en TypeScript/JS para PostgreSQL)
- **Formato:** Cada migración es un archivo con `up()` y `down()`, versionado por timestamp
- **Ubicación:** `packages/database/migrations/`
- **Ejecución:** Automática al iniciar el backend (vía script en `package.json` o entrypoint de Docker). También CLI: `npm run migrate:up` / `npm run migrate:down`
- **Integridad:** Cada migración corre dentro de una transacción. Si falla, se hace rollback automático
- **Seed data:** Archivos de seed para datos iniciales (primer Super Admin, configuración por defecto)
- **Control de versiones:** Las migraciones se versionan en Git junto con el código. Nunca se edita una migración ya aplicada — siempre se crea una nueva

**Flujo de trabajo diario:**
1. Developer crea archivo `1234567890-nombre-descriprito.ts`
2. Escribe `up()` (ALTER TABLE, CREATE INDEX, etc.) y `down()` (revert)
3. Corre `npm run migrate:up` en local para probar
4. Commit + push
5. CI/CD corre migraciones automáticamente antes del deploy

**Migraciones iniciales del MVP:**
1. Crear tabla `restaurantes`
2. Crear tabla `usuarios` (clientes comensales)
3. Crear tabla `mesas`
4. Crear tabla `mesas_unidas`
5. Crear tabla `platillos` + `categorias`
6. Crear tabla `modificadores` + `ad_ons`
7. Crear tabla `horarios_platillos`
8. Crear tabla `pedidos` + `items_pedido`
9. Crear tabla `staff` (meseros/cocina/admin)
10. Crear tabla `sesiones_mesa` + `codigos_invitacion`
11. Crear índices (`restaurante_id`, `celular`, `pedido_activo_id`, etc.)
12. Seed: crear Super Admin por defecto

### Security & Privacy

- **Auth:** JWT (access_token + refresh_token). Access token: 15 min. Refresh token: 7 días. Guardados en localStorage.
- **Login:** Celular + contraseña. Primera vez: registro con celular + crear contraseña.
- **Recuperación de contraseña:** Celular → OTP por WhatsApp (WhaConnect) → ingresar OTP → crear nueva contraseña.
- **Admin temporal:** El Super Admin crea admins con contraseña temporal. Primer login obliga a cambiar contraseña.
- **Contraseñas:** Hasheadas con bcrypt (salt rounds: 10)
- **Celular:** Identificador único, con consentimiento del usuario
- **Datos del comensal:** Visibles solo para el restaurante donde consumió
- **Roles:** Mesero no puede modificar precios. Cocina solo ve pedidos. Admin tiene acceso completo a su restaurante
- **HTTPS:** Forzado vía Nginx + Let's Encrypt
- **CORS:** Restringido al dominio del restaurante
- **Rate limiting:** 100 requests/min por IP en endpoints de auth, 1000 requests/min en el resto
- **Eliminación de fotos:** Al eliminar un platillo, su foto se borra del disco automáticamente

### Constraints (Zero Budget MVP)

- Todo corre en el VPS actual (4 vCPU, 8GB RAM, 100GB SSD) con Docker Compose
- Sin servicios pagados externos:
  - Firebase Cloud Messaging: gratuito
  - Fotos: almacenadas localmente en el VPS (`/var/www/fotos/`), servidas por Nginx
  - API WhaConnect (Baileys): el usuario ya la tiene implementada
  - Let's Encrypt: gratuito
  - Redis + PostgreSQL: en el VPS como contenedores Docker
- Sin Kubernetes ni serverless
- GitHub Actions gratuito
- Mono-repo: frontend + backend en un mismo repo con npm workspaces
- TypeScript en todo el proyecto (frontend y backend)
- HTTPS desde el inicio (requerido para Service Workers y PWA)
- Migraciones de BD versionadas en Git con `node-pg-migrate`, ejecutadas automáticamente en cada deploy
- JWT para auth (sin cookies, sin sesiones server-side)
- Una sola app React con rutas, un solo build
- Dominio único (sin wildcard), QR identifica restaurante + mesa
- Estructura de carpetas: `/frontend`, `/backend`, `/database`, `/shared`
- Sin tests automatizados en MVP (solo pruebas manuales)
- Seed data vacío: cada restaurante empieza desde cero
- Fotos en disco: `/var/www/fotos/{restaurante_id}/{platillo_id}.webp`

### Design System (Black & White Minimal)

- **Paleta:** Fondo blanco (`bg-white`), texto negro (`text-black`), grises para bordes/secundario (`text-gray-500`, `border-gray-200`)
- **Sin colores de acento** — no se usa indigo, azul, verde ni ningún color de marca. El único color funcional permitido es rojo para errores (`text-red-500`) y verde tenue para éxito (`text-green-700`)
- **Botones:** Fondo negro (`bg-black`), texto blanco, hover gris oscuro (`hover:bg-gray-800`)
- **Cards:** Borde fino (`border border-gray-200`), sin sombra
- **Esquinas:** `rounded-md` (4px) — minimales, sin excesos
- **Inputs:** Fondo gris claro (`bg-gray-50`), borde gris (`border-gray-200`)
- **Sidebar admin:** Fondo gris claro (`bg-gray-50`), activo en negro
- **Cerrar sesión visible** en toda vista: esquina superior derecha o sidebar. En layouts con navegación distinta por breakpoint (ej. Admin: sidebar en desktop, bottom nav en móvil), el botón debe repetirse en un header propio de la vista móvil — no basta con ocultarlo dentro de un bloque `hidden md:flex`
- **Sin íconos decorativos** — solo funcionales (estados de mesa, emojis de categorías)

---

## 5. Risks & Roadmap

### Technical Risks

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Cuello de botella en PostgreSQL | Media | Alto | Índices optimizados, Redis para caché de menú, pool de conexiones |
| PWA notificaciones push en iOS | Alta | Medio | Sonido local + pantalla como fallback. Polling cuando la app está abierta |
| VPS se queda sin recursos (CPU/RAM) | Media | Medio | Migrar a K8s o serverless cuando se llegue a ~500 restaurantes |
| Disco del VPS se llena con fotos | Media | Medio | Límite de 5MB por foto, conversión a webp (~100-300KB c/u). Con 100GB caben ~300K fotos. Monitorear uso |
| WhatsApp OTP: cambios en API de Meta | Media | Alto | Tener Twilio como respaldo |
| WebSocket cae con muchos usuarios | Baja | Medio | Redis como adaptador de Socket.io |

### Phased Rollout

| Fase | Qué incluye | Semanas | Dependencias |
|------|------------|---------|-------------|
| **Setup inicial** | Infraestructura: Docker Compose, Nginx + HTTPS, BD + Redis, migraciones automatizadas, seed Super Admin | 1 | Ninguna |
| **MVP** | Módulo 1 (Menú + QR con cache híbrido) + Módulo 2 (Pedidos + Cocina con pre-pedido) + Módulo 5 (Perfiles separados mesero/cocina) + Módulo 6 básico (CRUD menú) + Panel Super Admin (crear restaurantes + admin inicial) | 8-10 | Setup inicial |
| **Fase 2** | Módulo 3 completo (Semáforo, zonas, unión/separación, alertas configurables) | +4 | MVP |
| **Fase 3** | Módulo 4 completo (Cuenta, división, propina antes de pagar, para llevar, deudas) | +4 | Fase 2 |
| **Fase 4** | Módulo 6 completo (Promociones, reportes completos) + Módulo 7 (CRM básico) | +6 | Fase 3 |
| **Fase 5** | Módulo 8 (Reservas) + Pasarela de pago digital | +6 | Fase 4 |

### Pricing Model

| Plan | Mesas | Precio/mes | Incluye |
|------|-------|-----------|---------|
| Fonda | 1-10 | $299 | Módulos 1, 2, 5 |
| Restaurante | 11-25 | $599 | + Módulo 3, 4 |
| Grande | 26-50 | $999 | + Módulo 6 completo, 7 |
| Cadena | 50+ | Personalizado | Todo + soporte dedicado |

Setup inicial: $500-1000 (configuración, capacitación, impresión de QRs fijos)
