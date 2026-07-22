import { pool } from '../db.js'

export interface Usuario {
  id: number
  restaurante_id: number | null
  celular: string
  password_hash: string
  nombre: string
  rol: 'super_admin' | 'admin' | 'cocina' | 'mesero' | 'comensal'
  force_password_change: boolean
  fecha_nacimiento: string | null
  created_at: string
}

export async function findByCelular(restaurante_id: number | null | undefined, celular: string) {
  if (restaurante_id === undefined || restaurante_id === null) {
    const r = await pool.query<Usuario>('SELECT * FROM usuarios WHERE celular = $1', [celular])
    return r.rows[0] || null
  }
  const r = await pool.query<Usuario>(
    'SELECT * FROM usuarios WHERE restaurante_id = $1 AND celular = $2',
    [restaurante_id, celular],
  )
  return r.rows[0] || null
}

export async function findById(id: number) {
  const r = await pool.query<Usuario>('SELECT * FROM usuarios WHERE id = $1', [id])
  return r.rows[0] || null
}

export async function create(data: {
  restaurante_id: number | null
  celular: string
  password_hash: string
  nombre: string
  rol: Usuario['rol']
  force_password_change?: boolean
}) {
  const r = await pool.query<Usuario>(
    `INSERT INTO usuarios (restaurante_id, celular, password_hash, nombre, rol, force_password_change)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [data.restaurante_id, data.celular, data.password_hash, data.nombre, data.rol, data.force_password_change ?? (data.rol === 'admin')],
  )
  return r.rows[0]
}

export async function update(id: number, data: { nombre?: string; fecha_nacimiento?: string | null }) {
  const sets: string[] = []
  const values: (string | number | null)[] = []
  let idx = 1

  if (data.nombre !== undefined) {
    sets.push(`nombre = $${idx++}`)
    values.push(data.nombre)
  }
  if (data.fecha_nacimiento !== undefined) {
    sets.push(`fecha_nacimiento = $${idx++}`)
    values.push(data.fecha_nacimiento)
  }

  if (sets.length === 0) return null

  values.push(id)
  const r = await pool.query<Usuario>(
    `UPDATE usuarios SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    values,
  )
  return r.rows[0] || null
}
