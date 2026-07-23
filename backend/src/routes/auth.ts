import type { FastifyInstance } from 'fastify'
import { hashPassword, verifyPassword, signAccessToken, signRefreshToken } from '../services/auth.js'
import * as Usuario from '../models/usuario.js'
import * as Session from '../models/session.js'
import { rateLimit } from '../utils/rate-limit.js'

export default async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/register', { preHandler: rateLimit({ max: 5, windowMs: 60000 }) }, async (request, reply) => {
    const { celular, password, nombre } = request.body as { celular: string; password: string; nombre?: string }

    if (!celular || !password) {
      return reply.status(400).send({ error: 'celular y password requeridos' })
    }

    const exists = await Usuario.findByCelular(null, celular)
    if (exists) {
      return reply.status(409).send({ error: 'El celular ya está registrado' })
    }

    const password_hash = await hashPassword(password)
    const usuario = await Usuario.create({
      restaurante_id: null,
      celular,
      password_hash,
      nombre: nombre || 'Comensal',
      rol: 'comensal',
    })

    const accessToken = await signAccessToken({ userId: usuario.id, restauranteId: null, rol: usuario.rol })
    const refreshToken = await signRefreshToken({ userId: usuario.id })

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await Session.create({ usuario_id: usuario.id, refresh_token: refreshToken, expires_at: expiresAt })

    return { accessToken, refreshToken, usuario: { id: usuario.id, nombre: usuario.nombre, celular: usuario.celular, rol: usuario.rol, restaurante_id: usuario.restaurante_id } }
  })

  app.post('/api/auth/login', async (request, reply) => {
    const { celular, password, restaurante_id } = request.body as { celular: string; password: string; restaurante_id?: number | null }

    const usuario = await Usuario.findByCelular(restaurante_id, celular)
    if (!usuario) {
      return reply.status(401).send({ error: 'Credenciales inválidas' })
    }

    const valid = await verifyPassword(password, usuario.password_hash)
    if (!valid) {
      return reply.status(401).send({ error: 'Credenciales inválidas' })
    }

    const accessToken = await signAccessToken({ userId: usuario.id, restauranteId: usuario.restaurante_id, rol: usuario.rol })
    const refreshToken = await signRefreshToken({ userId: usuario.id })

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await Session.create({ usuario_id: usuario.id, refresh_token: refreshToken, expires_at: expiresAt })

    return {
      accessToken,
      refreshToken,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        celular: usuario.celular,
        rol: usuario.rol,
        restaurante_id: usuario.restaurante_id,
        force_password_change: usuario.force_password_change,
      },
    }
  })

  app.post('/api/auth/refresh', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string }
    if (!refreshToken) {
      return reply.status(400).send({ error: 'refreshToken requerido' })
    }

    const session = await Session.findByToken(refreshToken)
    if (!session) {
      return reply.status(401).send({ error: 'Refresh token inválido o expirado' })
    }

    const usuario = await Usuario.findById(session.usuario_id)
    if (!usuario) {
      return reply.status(401).send({ error: 'Usuario no encontrado' })
    }

    const accessToken = await signAccessToken({ userId: usuario.id, restauranteId: usuario.restaurante_id, rol: usuario.rol })

    return { accessToken }
  })

  app.put('/api/auth/perfil', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const { nombre, fecha_nacimiento, password, newPassword } = request.body as {
      nombre?: string
      fecha_nacimiento?: string | null
      password?: string
      newPassword?: string
    }

    const usuario = await Usuario.findById(request.user!.userId)
    if (!usuario) return reply.status(404).send({ error: 'Usuario no encontrado' })

    if (newPassword) {
      if (!password) return reply.status(400).send({ error: 'password actual requerido' })
      const valid = await verifyPassword(password, usuario.password_hash)
      if (!valid) return reply.status(400).send({ error: 'Contraseña actual incorrecta' })
      const password_hash = await hashPassword(newPassword)
      const { pool } = await import('../db.js')
      await pool.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [password_hash, usuario.id])
    }

    const updated = await Usuario.update(usuario.id, { nombre, fecha_nacimiento })

    return {
      usuario: {
        id: usuario.id,
        nombre: updated?.nombre ?? usuario.nombre,
        celular: usuario.celular,
        rol: usuario.rol,
        restaurante_id: usuario.restaurante_id,
        fecha_nacimiento: updated?.fecha_nacimiento ?? usuario.fecha_nacimiento,
      },
    }
  })

  app.post('/api/auth/logout', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string }
    if (!refreshToken) {
      return reply.status(400).send({ error: 'refreshToken requerido' })
    }

    const session = await Session.findByToken(refreshToken)
    if (session) {
      await Session.removeByUsuarioId(session.usuario_id)
    }

    return { success: true }
  })

  app.post('/api/auth/recover', async (request, reply) => {
    const { celular } = request.body as { celular: string }
    if (!celular) {
      return reply.status(400).send({ error: 'celular requerido' })
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    app.log.info({ celular, otp }, 'OTP generado')

    return { success: true, message: 'OTP enviado (stub)' }
  })

  app.post('/api/auth/reset-password', async (request, reply) => {
    const { celular, otp, newPassword, restaurante_id } = request.body as { celular: string; otp: string; newPassword: string; restaurante_id?: number | null }

    if (!celular || !otp || !newPassword) {
      return reply.status(400).send({ error: 'celular, otp y newPassword requeridos' })
    }

    app.log.info({ celular, otp }, 'OTP validado (stub)')

    const usuario = await Usuario.findByCelular(restaurante_id ?? null, celular)
    if (!usuario) {
      return reply.status(404).send({ error: 'Usuario no encontrado' })
    }

    const password_hash = await hashPassword(newPassword)
    const { pool } = await import('../db.js')
    await pool.query('UPDATE usuarios SET password_hash = $1, force_password_change = false WHERE id = $2', [password_hash, usuario.id])

    return { success: true, message: 'Contraseña actualizada' }
  })
}
