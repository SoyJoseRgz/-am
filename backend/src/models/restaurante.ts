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

export async function update(id: number, data: { nombre?: string; slug?: string; direccion?: string; telefono?: string; activo?: boolean }) {
  const sets: string[] = []
  const vals: any[] = []
  let i = 1
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) { sets.push(`${k}=$${i++}`); vals.push(v) }
  }
  if (sets.length === 0) return null
  vals.push(id)
  const r = await pool.query<Restaurante>(`UPDATE restaurantes SET ${sets.join(',')} WHERE id=$${i} RETURNING *`, vals)
  return r.rows[0] || null
}

export async function remove(id: number) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM pedido_items WHERE pedido_id IN (SELECT id FROM pedidos WHERE restaurante_id = $1)', [id])
    await client.query('DELETE FROM pedidos WHERE restaurante_id = $1', [id])
    await client.query('DELETE FROM modificadores WHERE platillo_id IN (SELECT id FROM platillos WHERE restaurante_id = $1)', [id])
    await client.query('DELETE FROM platillos WHERE restaurante_id = $1', [id])
    await client.query('DELETE FROM categorias WHERE restaurante_id = $1', [id])
    await client.query('DELETE FROM mesa_usuarios WHERE restaurante_id = $1', [id])
    await client.query('DELETE FROM llamados WHERE restaurante_id = $1', [id])
    await client.query('DELETE FROM sessions WHERE usuario_id IN (SELECT id FROM usuarios WHERE restaurante_id = $1)', [id])
    await client.query('DELETE FROM usuarios WHERE restaurante_id = $1', [id])
    await client.query('DELETE FROM mesas WHERE restaurante_id = $1', [id])
    await client.query('DELETE FROM restaurantes WHERE id = $1', [id])
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}
