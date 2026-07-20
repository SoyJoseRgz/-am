import { pool } from '../db.js'

export interface Categoria {
  id: number
  restaurante_id: number
  nombre: string
  icono: string | null
  orden: number
  created_at: string
}

export async function findByRestaurante(restauranteId: number) {
  const r = await pool.query<Categoria>(
    'SELECT * FROM categorias WHERE restaurante_id = $1 ORDER BY orden ASC',
    [restauranteId],
  )
  return r.rows
}

export async function create(data: { restaurante_id: number; nombre: string; icono?: string }) {
  const max = await pool.query('SELECT COALESCE(MAX(orden),0)+1 AS next FROM categorias WHERE restaurante_id = $1', [data.restaurante_id])
  const orden = max.rows[0].next
  const r = await pool.query<Categoria>(
    'INSERT INTO categorias (restaurante_id, nombre, icono, orden) VALUES ($1,$2,$3,$4) RETURNING *',
    [data.restaurante_id, data.nombre, data.icono ?? null, orden],
  )
  return r.rows[0]
}

export async function update(id: number, data: { nombre?: string; icono?: string; orden?: number }) {
  const sets: string[] = []
  const vals: any[] = []
  let i = 1
  if (data.nombre !== undefined) { sets.push(`nombre=$${i++}`); vals.push(data.nombre) }
  if (data.icono !== undefined) { sets.push(`icono=$${i++}`); vals.push(data.icono) }
  if (data.orden !== undefined) { sets.push(`orden=$${i++}`); vals.push(data.orden) }
  if (sets.length === 0) return null
  vals.push(id)
  const r = await pool.query<Categoria>(`UPDATE categorias SET ${sets.join(',')} WHERE id=$${i} RETURNING *`, vals)
  return r.rows[0] || null
}

export async function remove(id: number) {
  await pool.query('DELETE FROM categorias WHERE id = $1', [id])
}
