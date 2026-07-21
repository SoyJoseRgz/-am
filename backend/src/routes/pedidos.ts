import type { FastifyInstance } from 'fastify'
import * as Pedido from '../models/pedido.js'
import * as Mesa from '../models/mesa.js'

export default async function pedidoRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  app.post('/api/pedidos', async (request, reply) => {
    const { mesa_id, items } = request.body as any
    const usuarioId = request.user!.userId!

    if (!mesa_id || !items || items.length === 0) {
      return reply.status(400).send({ error: 'Mesa e items requeridos' })
    }

    const mesa = await Mesa.findById(Number(mesa_id))
    if (!mesa) {
      return reply.status(404).send({ error: 'Mesa no encontrada' })
    }
    const restauranteId = mesa.restaurante_id

    const pedido = await Pedido.create({
      restaurante_id: restauranteId,
      mesa_id,
      usuario_id: usuarioId,
      items,
    })

    app.io.to(`room:restaurante:${restauranteId}`).emit('pedido:nuevo', { pedidoId: pedido.id, mesaId: mesa_id })
    app.io.to(`room:mesa:${restauranteId}:${mesa_id}`).emit('pedido:creado', { pedidoId: pedido.id })
    return pedido
  })

  app.get('/api/pedidos/mesa/:mesaId', async (request, reply) => {
    const { mesaId } = request.params as { mesaId: string }
    const mesa = await Mesa.findById(Number(mesaId))
    if (!mesa) {
      return reply.status(404).send({ error: 'Mesa no encontrada' })
    }
    return Pedido.findByMesa(mesa.restaurante_id, Number(mesaId))
  })
}

export async function cocinaRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)
  app.addHook('preHandler', app.requireRol('cocina', 'admin', 'super_admin'))

  app.get('/api/cocina/pedidos', async (request) => {
    const restauranteId = request.user!.restauranteId!
    return Pedido.findActivos(restauranteId)
  })

  app.put('/api/cocina/pedidos/:id/items/:itemId', async (request, reply) => {
    const { itemId } = request.params as { itemId: string }
    const { estado } = request.body as { estado: string }

    if (!['pendiente', 'preparando', 'listo', 'entregado'].includes(estado)) {
      return reply.status(400).send({ error: 'Estado inválido' })
    }

    const item = await Pedido.findByItemId(Number(itemId))
    if (!item) return reply.status(404).send({ error: 'Item no encontrado' })

    const updated = await Pedido.updateItemEstado(Number(itemId), estado)

    app.io.to(`room:mesa:${item.restaurante_id}:${item.mesa_id}`).emit('item:actualizado', {
      itemId: Number(itemId),
      estado,
    })
    app.io
      .to(`room:restaurante:${item.restaurante_id}`)
      .emit('item:actualizado', { itemId: Number(itemId), estado })
    return updated
  })
}

export async function adminCocinaRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)
  app.addHook('preHandler', app.requireRol('admin', 'super_admin'))

  app.get('/api/admin/pedidos', async (request) => {
    const restauranteId = request.user!.restauranteId!
    return Pedido.findActivos(restauranteId)
  })
}
