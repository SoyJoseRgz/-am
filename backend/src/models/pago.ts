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
}) {
  const r = await pool.query<Pago>(
    `INSERT INTO pagos (restaurante_id, mesa_id, usuario_id, split_type, metodo_pago, cambio_para, tip_pct, tip_monto)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [data.restaurante_id, data.mesa_id, data.usuario_id, data.split_type, data.metodo_pago, data.cambio_para, data.tip_pct, data.tip_monto],
  )
  return r.rows[0]
}
