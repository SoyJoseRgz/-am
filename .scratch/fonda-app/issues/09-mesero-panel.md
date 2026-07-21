# 09 — Mesero panel

**What to build:** Mesero login → role selector (Mesero / Cocina). If role = Mesero → semáforo dashboard showing all mesas with color-coded status chips: Libre 🟢, Ocupada 🔴, Unida 🟡, Limpiando 🟤. Each mesa card shows: número, estado, tiempo transcurrido, número de comensales, total acumulado de cuenta. Tap mesa → see order history, item states, llamados history. "Tomar orden" button → opens visual menu (same layout as digital menu) → add items on behalf of table → confirm to kitchen. "Cobrar" button → shows itemized check with IVA breakdown. Llamar mesero: comensal presses button in mesa view → notification pops on mesero's dashboard with mesa number → mesero acknowledges (notification dismissed).

**Blocked by:** 07, 08

**Estado real:** no iniciado (0/10)

- [ ] Mesero logs in and selects "Mesero" role
- [ ] Semáforo shows all mesas with status colors and real-time updates
- [ ] Each mesa card shows numero, estado, tiempo, comensales, total
- [ ] Tap mesa → detailed view with orders + items + llamados
- [ ] Manual order: mesero browses menu, adds items, confirms to kitchen
- [ ] "Cobrar" generates itemized check with IVA
- [ ] Comensal "Llamar mesero" triggers notification on mesero panel
- [ ] Mesero acknowledges notification (dismisses)
- [ ] Mesa status transitions: Ocupada → Unida → Limpiando → Libre (via mesero)
- [ ] Role switch from same login screen (no re-auth needed for role change)

**Notas:**
- Ruta `/dashboard` existe pero solo renderiza `DashboardPlaceholder` ("Panel del mesero — en construcción (ticket 09)")
- Login mapea rol `mesero` → `/dashboard` pero sin selector multi-rol
- Backend tiene `Mesa.setEstado()` y tabla `llamados` en migraciones, pero sin endpoints ni frontend
- La migración `010-llamados.ts` define la tabla pero no hay API para crear/recibir llamados
- Es el siguiente ticket a implementar
