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
  restaurante_id: number; nombre: string; celular: string; password_hash: string; rol: string; force_password_change?: boolean
}) {
  try {
    const r = await pool.query<Staff>(
      `INSERT INTO usuarios (restaurante_id, nombre, celular, password_hash, rol, force_password_change)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, restaurante_id, nombre, celular, rol, created_at`,
      [data.restaurante_id, data.nombre, data.celular, data.password_hash, data.rol, data.force_password_change ?? true],
    )
    return r.rows[0]
  } catch (e: any) {
    if (e.code === '23505') {
      throw new Error('El celular ya está registrado para este restaurante')
    }
    throw e
  }
}

export async function update(restauranteId: number, id: number, data: { nombre?: string; rol?: string }) {
  const sets: string[] = []
  const vals: any[] = []
  let i = 1
  if (data.nombre !== undefined) { sets.push(`nombre=$${i++}`); vals.push(data.nombre) }
  if (data.rol !== undefined) { sets.push(`rol=$${i++}`); vals.push(data.rol) }
  if (sets.length === 0) return null
  vals.push(id, restauranteId)
  const r = await pool.query<Staff>(
    `UPDATE usuarios SET ${sets.join(',')} WHERE id=$${i} AND restaurante_id=$${i+1} RETURNING id, restaurante_id, nombre, celular, rol, created_at`,
    vals,
  )
  return r.rows[0] || null
}

export async function remove(restauranteId: number, id: number) {
  await pool.query('UPDATE usuarios SET activo = false WHERE id = $1 AND restaurante_id = $2', [id, restauranteId])
}
