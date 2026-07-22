import { pool } from '../db.js'

export interface MesaUsuario {
  id: number
  restaurante_id: number
  mesa_id: number
  usuario_id: number
  codigo_invitacion: string
  activo: boolean
  created_at: string
}

export async function findByMesa(mesaId: number) {
  const r = await pool.query<MesaUsuario>(
    'SELECT mu.*, u.nombre, u.celular FROM mesa_usuarios mu JOIN usuarios u ON u.id = mu.usuario_id WHERE mu.mesa_id = $1 AND mu.activo = true',
    [mesaId],
  )
  return r.rows
}

export async function findByMesaYUsuario(mesaId: number, usuarioId: number) {
  const r = await pool.query<MesaUsuario>(
    'SELECT * FROM mesa_usuarios WHERE mesa_id = $1 AND usuario_id = $2 AND activo = true',
    [mesaId, usuarioId],
  )
  return r.rows[0] || null
}

export async function countActivosByMesa(mesaId: number) {
  const r = await pool.query<{ count: string }>(
    'SELECT COUNT(*) FROM mesa_usuarios WHERE mesa_id = $1 AND activo = true',
    [mesaId],
  )
  return parseInt(r.rows[0].count, 10)
}

export async function crear(data: {
  restaurante_id: number
  mesa_id: number
  usuario_id: number
  codigo_invitacion: string
}) {
  const r = await pool.query<MesaUsuario>(
    `INSERT INTO mesa_usuarios (restaurante_id, mesa_id, usuario_id, codigo_invitacion)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT ON CONSTRAINT uq_mesa_usuarios_user
     DO UPDATE SET activo = true, codigo_invitacion = EXCLUDED.codigo_invitacion
     RETURNING *`,
    [data.restaurante_id, data.mesa_id, data.usuario_id, data.codigo_invitacion],
  )
  return r.rows[0]
}

export async function validarCodigo(mesaId: number, codigo: string) {
  const r = await pool.query<MesaUsuario>(
    'SELECT * FROM mesa_usuarios WHERE mesa_id = $1 AND codigo_invitacion = $2 AND activo = true LIMIT 1',
    [mesaId, codigo],
  )
  return r.rows[0] || null
}

export async function findCodigoByMesa(mesaId: number) {
  const r = await pool.query<{ codigo_invitacion: string }>(
    'SELECT codigo_invitacion FROM mesa_usuarios WHERE mesa_id = $1 AND activo = true LIMIT 1',
    [mesaId],
  )
  return r.rows[0]?.codigo_invitacion || null
}

export async function desactivarByMesa(mesaId: number) {
  await pool.query('UPDATE mesa_usuarios SET activo = false WHERE mesa_id = $1 AND activo = true', [mesaId])
}
