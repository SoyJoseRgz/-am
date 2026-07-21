import { pool } from '../db.js'

export interface Pedido {
  id: number
  restaurante_id: number
  mesa_id: number
  usuario_id: number | null
  estado: string
  created_at: string
}

export interface PedidoItem {
  id: number
  pedido_id: number
  platillo_id: number
  usuario_id: number | null
  cantidad: number
  precio_unitario: string
  estado: string
  notas: string | null
  created_at: string
}

export interface PedidoCompleto extends Pedido {
  items: (PedidoItem & { nombre: string; modificadores: { id: number; nombre: string; precio: string }[] })[]
  comensal_nombre: string | null
}

export async function create(data: {
  restaurante_id: number
  mesa_id: number
  usuario_id: number
  items: { platillo_id: number; cantidad: number; precio_unitario: number; notas?: string; modificador_ids?: number[]; usuario_id?: number }[]
}) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const r = await client.query<Pedido>(
      `INSERT INTO pedidos (restaurante_id, mesa_id, usuario_id) VALUES ($1,$2,$3) RETURNING *`,
      [data.restaurante_id, data.mesa_id, data.usuario_id],
    )
    const pedido = r.rows[0]

    for (const item of data.items) {
      const itemUsuarioId = item.usuario_id ?? data.usuario_id
      const ir = await client.query<PedidoItem>(
        `INSERT INTO pedido_items (pedido_id, platillo_id, usuario_id, cantidad, precio_unitario, notas)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [pedido.id, item.platillo_id, itemUsuarioId, item.cantidad, item.precio_unitario, item.notas || null],
      )
      const pedidoItem = ir.rows[0]

      if (item.modificador_ids && item.modificador_ids.length > 0) {
        for (const mid of item.modificador_ids) {
          await client.query(
            `INSERT INTO pedido_item_modificadores (pedido_item_id, modificador_id) VALUES ($1,$2)`,
            [pedidoItem.id, mid],
          )
        }
      }
    }

    await client.query('UPDATE mesas SET estado = $1 WHERE id = $2', ['ocupada', data.mesa_id])
    await client.query('COMMIT')
    return pedido
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function findByMesa(restauranteId: number, mesaId: number) {
  const r = await pool.query<PedidoCompleto>(
    `SELECT p.*, u.nombre AS comensal_nombre
     FROM pedidos p
     LEFT JOIN usuarios u ON u.id = p.usuario_id
     WHERE p.restaurante_id = $1 AND p.mesa_id = $2 AND p.estado = 'activo'
     ORDER BY p.created_at DESC`,
    [restauranteId, mesaId],
  )
  const pedidos = r.rows
  for (const ped of pedidos) {
    const items = await pool.query(
      `SELECT pi.*, pl.nombre, u.nombre AS comensal_nombre
       FROM pedido_items pi
       JOIN platillos pl ON pl.id = pi.platillo_id
       LEFT JOIN usuarios u ON u.id = pi.usuario_id
       WHERE pi.pedido_id = $1
       ORDER BY pi.id`,
      [ped.id],
    )
    ped.items = items.rows
    for (const item of ped.items) {
      const mods = await pool.query(
        `SELECT pm.id, m.nombre_opcion AS nombre, m.precio
         FROM pedido_item_modificadores pm
         JOIN modificadores m ON m.id = pm.modificador_id
         WHERE pm.pedido_item_id = $1`,
        [item.id],
      )
      ;(item as any).modificadores = mods.rows
    }
  }
  return pedidos
}

export async function findActivos(restauranteId: number) {
  const r = await pool.query<PedidoCompleto>(
    `SELECT p.*, u.nombre AS comensal_nombre, me.numero AS mesa_numero
     FROM pedidos p
     LEFT JOIN usuarios u ON u.id = p.usuario_id
     JOIN mesas me ON me.id = p.mesa_id
     WHERE p.restaurante_id = $1 AND p.estado = 'activo'
     ORDER BY p.created_at ASC`,
    [restauranteId],
  )
  const pedidos = r.rows
  for (const ped of pedidos) {
    const items = await pool.query(
      `SELECT pi.*, pl.nombre, u.nombre AS comensal_nombre
       FROM pedido_items pi
       JOIN platillos pl ON pl.id = pi.platillo_id
       LEFT JOIN usuarios u ON u.id = pi.usuario_id
       WHERE pi.pedido_id = $1
       ORDER BY pi.id`,
      [ped.id],
    )
    ped.items = items.rows
    for (const item of ped.items) {
      const mods = await pool.query(
        `SELECT pm.id, m.nombre_opcion AS nombre, m.precio
         FROM pedido_item_modificadores pm
         JOIN modificadores m ON m.id = pm.modificador_id
         WHERE pm.pedido_item_id = $1`,
        [item.id],
      )
      ;(item as any).modificadores = mods.rows
    }
  }
  return pedidos
}

export async function updateItemEstado(itemId: number, estado: string) {
  const r = await pool.query<PedidoItem>(
    `UPDATE pedido_items SET estado = $1 WHERE id = $2 RETURNING *`,
    [estado, itemId],
  )
  return r.rows[0] || null
}

export async function findByItemId(itemId: number) {
  const r = await pool.query(
    `SELECT pi.*, p.restaurante_id, p.mesa_id
     FROM pedido_items pi
     JOIN pedidos p ON p.id = pi.pedido_id
     WHERE pi.id = $1`,
    [itemId],
  )
  return r.rows[0] || null
}
