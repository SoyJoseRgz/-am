import type { FastifyInstance } from 'fastify'
import * as Pedido from '../models/pedido.js'
import * as Mesa from '../models/mesa.js'
import * as MesaUsuario from '../models/mesa-usuario.js'
import * as Pago from '../models/pago.js'

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

  app.post('/api/pedidos/pagar', async (request, reply) => {
    const { mesa_id, split, metodo_pago, cambio_para, tip, tip_monto } = request.body as { mesa_id: number; split: string; metodo_pago: string; cambio_para: string | null; tip: number; tip_monto: number }
    const usuarioId = request.user!.userId!

    const mesa = await Mesa.findById(Number(mesa_id))
    if (!mesa) return reply.status(404).send({ error: 'Mesa no encontrada' })
    const restauranteId = mesa.restaurante_id

    const comensal = await MesaUsuario.findByMesaYUsuario(Number(mesa_id), usuarioId)
    if (!comensal) return reply.status(403).send({ error: 'No eres comensal de esta mesa' })

    if (split === 'yo_invito') {
      await Pedido.marcarTodoPagado(Number(mesa_id))
    } else {
      await Pedido.marcarPagado(Number(mesa_id), usuarioId)
    }

    const montoTotal = await Pago.calcularMontoTotal(Number(mesa_id), usuarioId, split, tip, tip_monto || 0, 'pct')

    await Pago.crear({
      restaurante_id: restauranteId,
      mesa_id: Number(mesa_id),
      usuario_id: usuarioId,
      split_type: split,
      metodo_pago: metodo_pago || 'efectivo',
      cambio_para: cambio_para || null,
      tip_pct: tip || 0,
      tip_monto: tip_monto || 0,
      monto_total: montoTotal,
    })

    app.io.to(`room:mesa:${restauranteId}:${mesa_id}`).emit('item:pagado', { usuarioId, split })
    app.io.to(`room:restaurante:${restauranteId}`).emit('item:pagado', { mesaId: mesa_id, usuarioId, split })

    const pendientes = await Pedido.pendientesSinPagar(Number(mesa_id))
    if (pendientes === 0) {
      await Mesa.setEstado(restauranteId, Number(mesa_id), 'pagada')
      app.io.to(`room:restaurante:${restauranteId}`).emit('mesa:estado', { mesaId: mesa_id, estado: 'pagada' })
      app.io.to(`room:mesa:${restauranteId}:${mesa_id}`).emit('mesa:estado', { mesaId: mesa_id, estado: 'pagada' })
    }

    return { success: true }
  })

  app.post('/api/pedidos/solicitar-pago', async (request, reply) => {
    const { mesa_id, split, metodo_pago, cambio_para, tip, tip_monto } = request.body as { mesa_id: number; split: string; metodo_pago: string; cambio_para: string | null; tip: number; tip_monto: number }
    const usuarioId = request.user!.userId!

    const mesa = await Mesa.findById(Number(mesa_id))
    if (!mesa) return reply.status(404).send({ error: 'Mesa no encontrada' })
    const restauranteId = mesa.restaurante_id

    const comensal = await MesaUsuario.findByMesaYUsuario(Number(mesa_id), usuarioId)
    if (!comensal) return reply.status(403).send({ error: 'No eres comensal de esta mesa' })

    const montoTotal = await Pago.calcularMontoTotal(Number(mesa_id), usuarioId, split, tip, tip_monto || 0, 'pct')

    const pago = await Pago.crearPendiente({
      restaurante_id: restauranteId,
      mesa_id: Number(mesa_id),
      usuario_id: usuarioId,
      split_type: split,
      metodo_pago: metodo_pago || 'efectivo',
      cambio_para: cambio_para || null,
      tip_pct: tip || 0,
      tip_monto: tip_monto || 0,
      monto_total: montoTotal,
    })

    app.io.to(`room:restaurante:${restauranteId}`).emit('pago:solicitado', {
      id: pago.id,
      mesa_id,
      usuario_id: usuarioId,
      metodo_pago: metodo_pago || 'efectivo',
      monto_total: montoTotal,
      split_type: split,
      tip_pct: tip || 0,
      tip_monto: tip_monto || 0,
      cambio_para: cambio_para || null,
      mesa_numero: mesa.numero,
    })

    return { success: true, pagoId: pago.id, metodo_pago: metodo_pago || 'efectivo' }
  })

  app.put('/api/pedidos/confirmar-pago/:pagoId', {
    preHandler: [app.authenticate, app.requireRol('mesero', 'admin', 'super_admin')],
  }, async (request, reply) => {
    const { pagoId } = request.params as { pagoId: string }
    const meseroId = request.user!.userId!
    const rid = request.user!.restauranteId!

    const pago = await Pago.findById(Number(pagoId))
    if (!pago) return reply.status(404).send({ error: 'Pago no encontrado' })
    if (pago.restaurante_id !== rid) return reply.status(403).send({ error: 'No autorizado' })
    if (pago.estado !== 'pendiente') return reply.status(400).send({ error: 'El pago ya fue confirmado' })

    if (pago.split_type === 'yo_invito') {
      await Pedido.marcarTodoPagado(pago.mesa_id)
    } else {
      await Pedido.marcarPagado(pago.mesa_id, pago.usuario_id)
    }

    await Pago.confirmar(Number(pagoId), meseroId)

    app.io.to(`room:mesa:${rid}:${pago.mesa_id}`).emit('item:pagado', { usuarioId: pago.usuario_id, split: pago.split_type })
    app.io.to(`room:restaurante:${rid}`).emit('item:pagado', { mesaId: pago.mesa_id, usuarioId: pago.usuario_id, split: pago.split_type })
    app.io.to(`room:mesa:${rid}:${pago.mesa_id}`).emit('pago:confirmado', { pagoId: pago.id, mesaId: pago.mesa_id })
    app.io.to(`room:restaurante:${rid}`).emit('pago:confirmado', { pagoId: pago.id, mesaId: pago.mesa_id })

    const pendientes = await Pedido.pendientesSinPagar(pago.mesa_id)
    if (pendientes === 0) {
      await Mesa.setEstado(rid, pago.mesa_id, 'pagada')
      app.io.to(`room:restaurante:${rid}`).emit('mesa:estado', { mesaId: pago.mesa_id, estado: 'pagada' })
      app.io.to(`room:mesa:${rid}:${pago.mesa_id}`).emit('mesa:estado', { mesaId: pago.mesa_id, estado: 'pagada' })
    }

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

