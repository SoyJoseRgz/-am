import { pool } from '../db.js'

export interface Restaurante {
  id: number
  nombre: string
  slug: string
  direccion: string | null
  telefono: string | null
  iva_porcentaje: string
  iva_incluido: boolean
  plan: string
  activo: boolean
  created_at: string
}

export async function findAll() {
  const r = await pool.query<Restaurante>('SELECT * FROM restaurantes ORDER BY created_at DESC')
  return r.rows
}

export async function findById(id: number) {
  const r = await pool.query<Restaurante>('SELECT * FROM restaurantes WHERE id = $1', [id])
  return r.rows[0] || null
}

export async function create(data: {
  nombre: string
  slug: string
  direccion?: string
  telefono?: string
}) {
  const r = await pool.query<Restaurante>(
    `INSERT INTO restaurantes (nombre, slug, direccion, telefono)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.nombre, data.slug, data.direccion ?? null, data.telefono ?? null],
  )
  return r.rows[0]
}
