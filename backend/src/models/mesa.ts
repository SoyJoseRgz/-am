import { pool } from '../db.js'

export interface Mesa {
  id: number
  restaurante_id: number
  numero: number
  qr_code: string | null
  estado: string
  created_at: string
}

export async function findById(id: number) {
  const r = await pool.query<Mesa>('SELECT * FROM mesas WHERE id = $1', [id])
  return r.rows[0] || null
}

export async function findByRestauranteYNumero(restauranteId: number, mesaId: number) {
  const r = await pool.query<Mesa>(
    'SELECT * FROM mesas WHERE restaurante_id = $1 AND id = $2',
    [restauranteId, mesaId],
  )
  return r.rows[0] || null
}

export async function findAllByRestaurante(restauranteId: number) {
  const r = await pool.query<Mesa>(
    'SELECT * FROM mesas WHERE restaurante_id = $1 ORDER BY numero ASC',
    [restauranteId],
  )
  return r.rows
}

export async function create(data: { restaurante_id: number; numero: number }) {
  const r = await pool.query<Mesa>(
    'INSERT INTO mesas (restaurante_id, numero) VALUES ($1, $2) RETURNING *',
    [data.restaurante_id, data.numero],
  )
  return r.rows[0]
}

export async function update(restauranteId: number, id: number, data: { numero?: number; qr_code?: string }) {
  const sets: string[] = []
  const vals: any[] = []
  let i = 1
  if (data.numero !== undefined) { sets.push(`numero=$${i++}`); vals.push(data.numero) }
  if (data.qr_code !== undefined) { sets.push(`qr_code=$${i++}`); vals.push(data.qr_code) }
  if (sets.length === 0) return null
  vals.push(id, restauranteId)
  const r = await pool.query<Mesa>(`UPDATE mesas SET ${sets.join(',')} WHERE id=$${i} AND restaurante_id=$${i+1} RETURNING *`, vals)
  return r.rows[0] || null
}

export async function remove(restauranteId: number, id: number) {
  await pool.query('DELETE FROM mesas WHERE id = $1 AND restaurante_id = $2', [id, restauranteId])
}

export async function setEstado(id: number, estado: string) {
  const r = await pool.query<Mesa>(
    'UPDATE mesas SET estado = $1 WHERE id = $2 RETURNING *',
    [estado, id],
  )
  return r.rows[0]
}
