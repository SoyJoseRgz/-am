import type { FastifyInstance } from 'fastify'
import { pool } from '../db.js'
import * as Mesa from '../models/mesa.js'
import * as MesaUsuario from '../models/mesa-usuario.js'

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
      if (!['libre', 'ocupada', 'unida', 'limpiando', 'pagada'].includes(estado)) return reply.status(400).send({ error: 'Estado inválido' })
      const m = await Mesa.setEstado(rid!, id, estado)
      if (['limpiando', 'libre'].includes(estado)) {
        await MesaUsuario.desactivarByMesa(id)
      }
      app.io?.to(`room:restaurante:${rid}`).emit('mesa:estado', { mesaId: id, estado })
      app.io?.to(`room:mesa:${rid}:${id}`).emit('mesa:estado', { mesaId: id, estado })
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
      await Mesa.setEstado(rid!, id, 'unida')
      await Mesa.setEstado(rid!, con_mesa_id, 'unida')
      app.io?.to(`room:restaurante:${rid}`).emit('mesa:unida', { mesa1: id, mesa2: con_mesa_id })
      app.io?.to(`room:mesa:${rid}:${id}`).emit('mesa:estado', { mesaId: id, estado: 'unida' })
      app.io?.to(`room:mesa:${rid}:${con_mesa_id}`).emit('mesa:estado', { mesaId: con_mesa_id, estado: 'unida' })
      return { success: true }
    },
  )

  app.post<{ Params: { id: string } }>(
    '/api/mesero/mesas/:id/separar',
    async (req, reply) => {
      const id = parseInt(req.params.id)
      const rid = req.user!.restauranteId
      if (!(await verificarMesa(id, rid!))) return reply.status(404).send({ error: 'Mesa no encontrada' })
      const m = await Mesa.setEstado(rid!, id, 'ocupada')
      if (!m) return reply.status(404).send({ error: 'Mesa no encontrada' })
      app.io?.to(`room:restaurante:${rid}`).emit('mesa:estado', { mesaId: id, estado: 'ocupada' })
      app.io?.to(`room:mesa:${rid}:${id}`).emit('mesa:estado', { mesaId: id, estado: 'ocupada' })
      return m
    },
  )

  app.get<{ Params: { id: string } }>('/api/mesero/mesas/:id/cuenta', async (req, reply) => {
    const mesaId = parseInt(req.params.id)
    const rid = req.user!.restauranteId
    if (!(await verificarMesa(mesaId, rid!))) return reply.status(404).send({ error: 'Mesa no encontrada' })
    const items = await pool.query(
      `SELECT pi.id, pi.platillo_id, pi.usuario_id, pi.cantidad,
              pi.precio_unitario, pi.estado, pi.notas,
              pl.nombre, u.nombre AS comensal_nombre
       FROM pedido_items pi
       JOIN pedidos p ON p.id = pi.pedido_id AND p.estado = 'activo'
       JOIN platillos pl ON pl.id = pi.platillo_id
       LEFT JOIN usuarios u ON u.id = pi.usuario_id
       WHERE p.mesa_id = $1 AND p.restaurante_id = $2
       ORDER BY pi.usuario_id, pi.id`,
      [mesaId, rid],
    )
    const iva = await pool.query(
      `SELECT iva_porcentaje, iva_incluido FROM restaurantes WHERE id = $1`,
      [rid],
    )
    return {
      items: items.rows,
      iva_porcentaje: Number(iva.rows[0]?.iva_porcentaje || 16),
      iva_incluido: iva.rows[0]?.iva_incluido ?? true,
      mesa_id: mesaId,
    }
  })
}
