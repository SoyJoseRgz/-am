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

  app.put('/api/pedidos/:id/items/:itemId/cancelar', async (request, reply) => {
    const { itemId } = request.params as { itemId: string }
    const usuarioId = request.user!.userId!

    const item = await Pedido.findByItemId(Number(itemId))
    if (!item) return reply.status(404).send({ error: 'Item no encontrado' })
    if (item.usuario_id !== usuarioId) {
      return reply.status(403).send({ error: 'No puedes cancelar items de otro comensal' })
    }
    if (item.estado !== 'pendiente') {
      return reply.status(400).send({ error: 'Solo puedes cancelar items en estado pendiente' })
    }

    await Pedido.updateItemEstado(Number(itemId), 'cancelado', 'Cancelado por comensal')

    app.io.to(`room:mesa:${item.restaurante_id}:${item.mesa_id}`).emit('item:actualizado', {
      itemId: Number(itemId), estado: 'cancelado',
    })
    app.io.to(`room:restaurante:${item.restaurante_id}`).emit('item:actualizado', {
      itemId: Number(itemId), estado: 'cancelado',
    })
    return { success: true }
  })
}

export async function cocinaRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)
  app.addHook('preHandler', app.requireRol('cocina', 'mesero', 'admin', 'super_admin'))

  app.get('/api/cocina/pedidos', async (request) => {
    const restauranteId = request.user!.restauranteId!
    return Pedido.findActivos(restauranteId)
  })

  app.put('/api/cocina/pedidos/:id/items/:itemId', async (request, reply) => {
    const { itemId } = request.params as { itemId: string }
    const { estado, motivo } = request.body as { estado: string; motivo?: string }

    if (!['pendiente', 'preparando', 'listo', 'entregado', 'cancelado'].includes(estado)) {
      return reply.status(400).send({ error: 'Estado inválido' })
    }

    const item = await Pedido.findByItemId(Number(itemId))
    if (!item) return reply.status(404).send({ error: 'Item no encontrado' })

    const updated = await Pedido.updateItemEstado(Number(itemId), estado, motivo)

    app.io.to(`room:mesa:${item.restaurante_id}:${item.mesa_id}`).emit('item:actualizado', {
      itemId: Number(itemId),
      estado,
      motivo,
    })
    app.io
      .to(`room:restaurante:${item.restaurante_id}`)
      .emit('item:actualizado', { itemId: Number(itemId), estado, motivo })
    return updated
  })
}

