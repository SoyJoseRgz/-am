import { pool } from '../db.js'

export interface Modificador {
  id: number
  restaurante_id: number
  platillo_id: number
  nombre_grupo: string
  nombre_opcion: string
  precio: string
  max_seleccion: number
  created_at: string
}

export async function findByPlatillo(platilloId: number) {
  const r = await pool.query<Modificador>(
    'SELECT * FROM modificadores WHERE platillo_id = $1 ORDER BY nombre_grupo, id',
    [platilloId],
  )
  return r.rows
}

export async function create(data: {
  restaurante_id: number; platillo_id: number
  nombre_grupo: string; nombre_opcion: string
  precio?: number; max_seleccion?: number
}) {
  const r = await pool.query<Modificador>(
    `INSERT INTO modificadores (restaurante_id, platillo_id, nombre_grupo, nombre_opcion, precio, max_seleccion)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [data.restaurante_id, data.platillo_id, data.nombre_grupo, data.nombre_opcion, data.precio ?? 0, data.max_seleccion ?? 1],
  )
  return r.rows[0]
}

export async function update(restauranteId: number, id: number, data: Partial<{
  nombre_grupo: string; nombre_opcion: string; precio: number; max_seleccion: number
}>) {
  const sets: string[] = []
  const vals: any[] = []
  let i = 1
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) { sets.push(`${k}=$${i++}`); vals.push(v) }
  }
  if (sets.length === 0) return null
  vals.push(id, restauranteId)
  const r = await pool.query<Modificador>(`UPDATE modificadores SET ${sets.join(',')} WHERE id=$${i} AND restaurante_id=$${i+1} RETURNING *`, vals)
  return r.rows[0] || null
}

export async function remove(restauranteId: number, id: number) {
  await pool.query('DELETE FROM modificadores WHERE id = $1 AND restaurante_id = $2', [id, restauranteId])
}
