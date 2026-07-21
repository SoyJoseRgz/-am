import type { FastifyInstance } from 'fastify'
import { pool } from '../db.js'
import * as Mesa from '../models/mesa.js'

export default async function meseroRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)
  app.addHook('preHandler', app.requireRol('mesero', 'admin', 'super_admin'))

  app.get('/api/mesero/mesas', async (req) => {
    const restauranteId = req.user!.restauranteId
    const mesas = await Mesa.findAllByRestaurante(restauranteId!)
    const result = []
    for (const m of mesas) {
      const r = await pool.query(
        `SELECT COUNT(*)::int AS c FROM mesa_usuarios WHERE mesa_id = $1 AND activo = true`,
        [m.id],
      )
      const p = await pool.query(
        `SELECT COUNT(*)::int AS c FROM pedidos WHERE mesa_id = $1 AND estado = 'activo'`,
        [m.id],
      )
      result.push({
        id: m.id, numero: m.numero, estado: m.estado,
        comensales: r.rows[0].c,
        pedidos_activos: p.rows[0].c,
      })
    }
    return result
  })

  async function verificarMesa(mesaId: number, restauranteId: number) {
    const m = await Mesa.findById(mesaId)
    if (!m || m.restaurante_id !== restauranteId) return null
    return m
  }

  app.put<{ Params: { id: string }; Body: { estado: string } }>(
    '/api/mesero/mesas/:id/estado',
    async (req, reply) => {
      const id = parseInt(req.params.id)
      const rid = req.user!.restauranteId
      if (!(await verificarMesa(id, rid!))) return reply.status(404).send({ error: 'Mesa no encontrada' })
      const { estado } = req.body
      if (!['libre', 'ocupada', 'unida', 'limpiando'].includes(estado)) return reply.status(400).send({ error: 'Estado inválido' })
      const m = await Mesa.setEstado(id, estado)
      app.io?.to(`room:restaurante:${rid}`).emit('mesa:estado', { mesaId: id, estado })
      return m
    },
  )

  app.post<{ Params: { id: string }; Body: { con_mesa_id: number } }>(
    '/api/mesero/mesas/:id/unir',
    async (req, reply) => {
      const id = parseInt(req.params.id)
      const rid = req.user!.restauranteId
      if (!(await verificarMesa(id, rid!))) return reply.status(404).send({ error: 'Mesa no encontrada' })
      const { con_mesa_id } = req.body
      if (!(await verificarMesa(con_mesa_id, rid!))) return reply.status(404).send({ error: 'Mesa destino no encontrada' })
      await Mesa.setEstado(id, 'unida')
      await Mesa.setEstado(con_mesa_id, 'unida')
      app.io?.to(`room:restaurante:${rid}`).emit('mesa:unida', { mesa1: id, mesa2: con_mesa_id })
      return { success: true }
    },
  )

  app.post<{ Params: { id: string } }>(
    '/api/mesero/mesas/:id/separar',
    async (req, reply) => {
      const id = parseInt(req.params.id)
      const rid = req.user!.restauranteId
      if (!(await verificarMesa(id, rid!))) return reply.status(404).send({ error: 'Mesa no encontrada' })
      const m = await Mesa.setEstado(id, 'ocupada')
      if (!m) return reply.status(404).send({ error: 'Mesa no encontrada' })
      app.io?.to(`room:restaurante:${rid}`).emit('mesa:estado', { mesaId: id, estado: 'ocupada' })
      return m
    },
  )
}
