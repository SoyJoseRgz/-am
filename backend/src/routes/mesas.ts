import type { FastifyInstance } from 'fastify'
import * as Mesa from '../models/mesa.js'
import * as MesaUsuario from '../models/mesa-usuario.js'
import QRCode from 'qrcode'

export default async function mesaRoutes(app: FastifyInstance) {
  app.get('/api/mesas/:id', async (request, reply) => {
    const { restaurante_id } = request.query as { restaurante_id?: string }
    const id = parseInt((request.params as { id: string }).id, 10)

    if (!restaurante_id) {
      return reply.status(400).send({ error: 'restaurante_id requerido' })
    }

    const mesa = await Mesa.findByRestauranteYNumero(parseInt(restaurante_id, 10), id)
    if (!mesa) {
      return reply.status(404).send({ error: 'Mesa no encontrada' })
    }

    const comensales = await MesaUsuario.findByMesa(mesa.id)
    const codigo_invitacion = await MesaUsuario.findCodigoByMesa(mesa.id)

    return { mesa: { id: mesa.id, numero: mesa.numero, estado: mesa.estado }, comensales, codigo_invitacion }
  })

  app.post('/api/mesas/:id/join', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { restaurante_id, codigo } = request.body as { restaurante_id: number; codigo?: string }
    const mesaId = parseInt((request.params as { id: string }).id, 10)
    const usuarioId = request.user!.userId

    const mesa = await Mesa.findById(mesaId)
    if (!mesa || mesa.restaurante_id !== restaurante_id) {
      return reply.status(404).send({ error: 'Mesa no encontrada' })
    }

    const yaUnido = await MesaUsuario.findByMesaYUsuario(mesaId, usuarioId)
    if (yaUnido) {
      return { mesa: { id: mesa.id, numero: mesa.numero, estado: mesa.estado }, yaUnido: true }
    }

    const activos = await MesaUsuario.countActivosByMesa(mesaId)

    if (activos === 0) {
      const codigo_invitacion = Math.floor(1000 + Math.random() * 9000).toString()
      await MesaUsuario.crear({
        restaurante_id: restaurante_id,
        mesa_id: mesaId,
        usuario_id: usuarioId,
        codigo_invitacion,
      })
      await Mesa.setEstado(mesaId, 'ocupada')

      app.io.to(`room:restaurante:${restaurante_id}`).emit('mesa:estado', { mesaId, estado: 'ocupada' })
      app.io.to(`room:mesa:${restaurante_id}:${mesaId}`).emit('comensal:unido', { usuarioId })

      return { mesa: { id: mesa.id, numero: mesa.numero, estado: 'ocupada' }, codigo_invitacion, primero: true }
    }

    if (!codigo) {
      return reply.status(400).send({ error: 'Código de invitación requerido' })
    }

    const valido = await MesaUsuario.validarCodigo(mesaId, codigo)
    if (!valido) {
      return reply.status(400).send({ error: 'Código de invitación inválido' })
    }

    await MesaUsuario.crear({
      restaurante_id: restaurante_id,
      mesa_id: mesaId,
      usuario_id: usuarioId,
      codigo_invitacion: codigo,
    })

    app.io.to(`room:mesa:${restaurante_id}:${mesaId}`).emit('comensal:unido', { usuarioId })

    return { mesa: { id: mesa.id, numero: mesa.numero, estado: mesa.estado }, codigo_invitacion: codigo, primero: false }
  })

  app.get('/api/mesas/:id/qr', async (request, reply) => {
    const id = parseInt((request.params as { id: string }).id, 10)
    const mesa = await Mesa.findById(id)
    if (!mesa) {
      return reply.status(404).send({ error: 'Mesa no encontrada' })
    }

    const url = `https://miresto.app/m/${mesa.restaurante_id}/${mesa.id}`
    const qr = await QRCode.toBuffer(url, { type: 'png', width: 400, margin: 2 })

    reply.header('Content-Type', 'image/png')
    reply.header('Content-Disposition', `attachment; filename="mesa-${mesa.numero}.png"`)
    return reply.send(qr)
  })
}
