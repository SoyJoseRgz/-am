import { pool } from '../db.js'

export interface Staff {
  id: number
  restaurante_id: number
  nombre: string
  celular: string
  rol: string
  activo: boolean
  created_at: string
}

export async function findByRestaurante(restauranteId: number) {
  const r = await pool.query<Staff>(
    "SELECT * FROM usuarios WHERE restaurante_id = $1 AND rol IN ('mesero','cocina') ORDER BY nombre",
    [restauranteId],
  )
  return r.rows
}

export async function create(data: {
  restaurante_id: number; nombre: string; celular: string; password_hash: string; rol: string
}) {
  const r = await pool.query<Staff>(
    `INSERT INTO usuarios (restaurante_id, nombre, celular, password_hash, rol)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, restaurante_id, nombre, celular, rol, created_at`,
    [data.restaurante_id, data.nombre, data.celular, data.password_hash, data.rol],
  )
  return r.rows[0]
}

export async function update(id: number, data: { nombre?: string; rol?: string }) {
  const sets: string[] = []
  const vals: any[] = []
  let i = 1
  if (data.nombre !== undefined) { sets.push(`nombre=$${i++}`); vals.push(data.nombre) }
  if (data.rol !== undefined) { sets.push(`rol=$${i++}`); vals.push(data.rol) }
  if (sets.length === 0) return null
  vals.push(id)
  const r = await pool.query<Staff>(
    `UPDATE usuarios SET ${sets.join(',')} WHERE id=$${i} RETURNING id, restaurante_id, nombre, celular, rol, created_at`,
    vals,
  )
  return r.rows[0] || null
}

export async function remove(id: number) {
  await pool.query('UPDATE usuarios SET activo = false WHERE id = $1', [id])
}
