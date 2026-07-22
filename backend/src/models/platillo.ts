import { pool } from '../db.js'

export interface Platillo {
  id: number
  restaurante_id: number
  categoria_id: number
  nombre: string
  descripcion: string | null
  precio: string
  foto_url: string | null
  tiempo_preparacion: number | null
  activo: boolean
  agotado: boolean
  created_at: string
}

export async function findByRestaurante(restauranteId: number) {
  const r = await pool.query<Platillo>(
    'SELECT * FROM platillos WHERE restaurante_id = $1 AND activo = true ORDER BY categoria_id, id',
    [restauranteId],
  )
  return r.rows
}

export async function findById(id: number) {
  const r = await pool.query<Platillo>('SELECT * FROM platillos WHERE id = $1', [id])
  return r.rows[0] || null
}

export async function create(data: {
  restaurante_id: number; categoria_id: number; nombre: string
  descripcion?: string; precio: number; tiempo_preparacion?: number
}) {
  const r = await pool.query<Platillo>(
    `INSERT INTO platillos (restaurante_id, categoria_id, nombre, descripcion, precio, tiempo_preparacion)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [data.restaurante_id, data.categoria_id, data.nombre, data.descripcion ?? null, data.precio, data.tiempo_preparacion ?? 10],
  )
  return r.rows[0]
}

export async function update(restauranteId: number, id: number, data: Partial<{
  categoria_id: number; nombre: string; descripcion: string; precio: number
  foto_url: string; tiempo_preparacion: number; activo: boolean; agotado: boolean
}>) {
  const sets: string[] = []
  const vals: any[] = []
  let i = 1
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) { sets.push(`${k}=$${i++}`); vals.push(v) }
  }
  if (sets.length === 0) return null
  vals.push(id, restauranteId)
  const r = await pool.query<Platillo>(`UPDATE platillos SET ${sets.join(',')} WHERE id=$${i} AND restaurante_id=$${i+1} RETURNING *`, vals)
  return r.rows[0] || null
}

export async function remove(restauranteId: number, id: number) {
  await pool.query('UPDATE platillos SET activo = false WHERE id = $1 AND restaurante_id = $2', [id, restauranteId])
}

export async function duplicate(restauranteId: number, id: number) {
  const orig = await pool.query<Platillo>('SELECT * FROM platillos WHERE id = $1 AND restaurante_id = $2', [id, restauranteId])
  if (!orig.rows[0]) return null
  const r = await pool.query<Platillo>(
     `INSERT INTO platillos (restaurante_id, categoria_id, nombre, descripcion, precio, foto_url, tiempo_preparacion)
     VALUES ($1,$2,$3||' (copia)',$4,$5,$6,$7) RETURNING *`,
    [orig.rows[0].restaurante_id, orig.rows[0].categoria_id, orig.rows[0].nombre, orig.rows[0].descripcion, orig.rows[0].precio, orig.rows[0].foto_url, orig.rows[0].tiempo_preparacion],
  )
  return r.rows[0]
}

export async function updateFoto(restauranteId: number, id: number, fotoUrl: string) {
  const r = await pool.query<Platillo>('UPDATE platillos SET foto_url = $1 WHERE id = $2 AND restaurante_id = $3 RETURNING *', [fotoUrl, id, restauranteId])
  return r.rows[0] || null
}
