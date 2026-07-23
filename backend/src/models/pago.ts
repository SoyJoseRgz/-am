import { pool } from '../db.js'

export interface Pago {
  id: number
  restaurante_id: number
  mesa_id: number
  usuario_id: number
  split_type: string
  metodo_pago: string
  cambio_para: string | null
  tip_pct: number | null
  tip_monto: number
  estado: string
  monto_total: number
  mesero_id: number | null
  created_at: string
}

export async function crear(data: {
  restaurante_id: number
  mesa_id: number
  usuario_id: number
  split_type: string
  metodo_pago: string
  cambio_para: string | null
  tip_pct: number | null
  tip_monto: number
  monto_total?: number
}) {
  const r = await pool.query<Pago>(
    `INSERT INTO pagos (restaurante_id, mesa_id, usuario_id, split_type, metodo_pago, cambio_para, tip_pct, tip_monto, estado, monto_total)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'confirmado',$9) RETURNING *`,
    [data.restaurante_id, data.mesa_id, data.usuario_id, data.split_type, data.metodo_pago, data.cambio_para, data.tip_pct, data.tip_monto, data.monto_total || 0],
  )
  return r.rows[0]
}

export async function crearPendiente(data: {
  restaurante_id: number
  mesa_id: number
  usuario_id: number
  split_type: string
  metodo_pago: string
  cambio_para: string | null
  tip_pct: number | null
  tip_monto: number
  monto_total: number
}) {
  const r = await pool.query<Pago>(
    `INSERT INTO pagos (restaurante_id, mesa_id, usuario_id, split_type, metodo_pago, cambio_para, tip_pct, tip_monto, estado, monto_total)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pendiente',$9) RETURNING *`,
    [data.restaurante_id, data.mesa_id, data.usuario_id, data.split_type, data.metodo_pago, data.cambio_para, data.tip_pct, data.tip_monto, data.monto_total],
  )
  return r.rows[0]
}

export async function findById(id: number) {
  const r = await pool.query<Pago>(`SELECT * FROM pagos WHERE id = $1`, [id])
  return r.rows[0] || null
}

export async function confirmar(id: number, meseroId: number) {
  const r = await pool.query<Pago>(
    `UPDATE pagos SET estado = 'confirmado', mesero_id = $2 WHERE id = $1 AND estado = 'pendiente' RETURNING *`,
    [id, meseroId],
  )
  return r.rows[0] || null
}

export async function findPendientesByRestaurante(restauranteId: number) {
  const r = await pool.query(
    `SELECT p.*, m.numero AS mesa_numero, u.nombre AS usuario_nombre
     FROM pagos p
     JOIN mesas m ON m.id = p.mesa_id
     LEFT JOIN usuarios u ON u.id = p.usuario_id
     WHERE p.restaurante_id = $1 AND p.estado = 'pendiente'
     ORDER BY p.created_at DESC`,
    [restauranteId],
  )
  return r.rows
}

export async function calcularMontoTotal(mesaId: number, usuarioId: number, split: string, tip: number, tipMonto: number, tipMode: string) {
  const items = await pool.query(
    `SELECT pi.usuario_id, pi.cantidad, pi.precio_unitario
     FROM pedido_items pi
     JOIN pedidos p ON p.id = pi.pedido_id AND p.estado = 'activo'
     WHERE p.mesa_id = $1 AND pi.estado <> 'cancelado' AND pi.pagado = false`,
    [mesaId],
  )

  const ivaR = await pool.query(
    `SELECT r.iva_porcentaje, r.iva_incluido
     FROM restaurantes r
     JOIN mesas m ON m.restaurante_id = r.id
     WHERE m.id = $1`,
    [mesaId],
  )
  const ivaPct = Number(ivaR.rows[0]?.iva_porcentaje || 16)
  const ivaIncluido = ivaR.rows[0]?.iva_incluido ?? true

  const byUser: Record<number, number> = {}
  for (const item of items.rows) {
    const uid = item.usuario_id || 0
    byUser[uid] = (byUser[uid] || 0) + Number(item.precio_unitario) * item.cantidad
  }

  const total = Object.values(byUser).reduce((s: number, v: number) => s + v, 0)
  const usersWithItems = Object.keys(byUser).length

  let subtotalAPagar: number
  if (split === 'yo_invito') {
    subtotalAPagar = total
  } else if (split === 'iguales') {
    subtotalAPagar = total / Math.max(usersWithItems, 1)
  } else {
    subtotalAPagar = byUser[usuarioId] || 0
  }

  const iva = ivaIncluido ? 0 : Math.round(subtotalAPagar * ivaPct) / 100
  const tipAmount = tipMode === 'amount' ? tipMonto : Math.round(subtotalAPagar * tip) / 100

  return Math.round((subtotalAPagar + iva + tipAmount) * 100) / 100
}
