import { pool } from '../db.js'

export interface Session {
  id: number
  usuario_id: number
  refresh_token: string
  expires_at: string
  created_at: string
}

export async function create(data: { usuario_id: number; refresh_token: string; expires_at: Date }) {
  const r = await pool.query<Session>(
    `INSERT INTO sessions (usuario_id, refresh_token, expires_at) VALUES ($1, $2, $3) RETURNING *`,
    [data.usuario_id, data.refresh_token, data.expires_at],
  )
  return r.rows[0]
}

export async function findByToken(refresh_token: string) {
  const r = await pool.query<Session>(
    'SELECT * FROM sessions WHERE refresh_token = $1 AND expires_at > NOW()',
    [refresh_token],
  )
  return r.rows[0] || null
}

export async function removeByUsuarioId(usuario_id: number) {
  await pool.query('DELETE FROM sessions WHERE usuario_id = $1', [usuario_id])
}
