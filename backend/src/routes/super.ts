import type { FastifyInstance } from 'fastify'
import { hashPassword } from '../services/auth.js'
import * as Restaurante from '../models/restaurante.js'
import * as Usuario from '../models/usuario.js'

export default async function superRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)
  app.addHook('preHandler', app.requireRol('super_admin'))

  app.get('/api/super/restaurantes', async () => {
    const restaurantes = await Restaurante.findAll()
    return { restaurantes }
  })

  app.post('/api/super/restaurantes', async (request, reply) => {
    const { nombre, slug, direccion, telefono, adminCelular, adminNombre } = request.body as {
      nombre: string; slug: string; direccion?: string; telefono?: string
      adminCelular: string; adminNombre: string
    }
    if (!nombre || !slug || !adminCelular || !adminNombre) {
      return reply.status(400).send({ error: 'nombre, slug, adminCelular y adminNombre requeridos' })
    }
    const restaurante = await Restaurante.create({ nombre, slug, direccion, telefono })
    const tempPassword = Math.random().toString(36).slice(-8)
    const password_hash = await hashPassword(tempPassword)
    const admin = await Usuario.create({
      restaurante_id: restaurante.id, celular: adminCelular, password_hash,
      nombre: adminNombre, rol: 'admin', force_password_change: true,
    })
    return { restaurante, admin: { id: admin.id, nombre: admin.nombre, celular: admin.celular, force_password_change: true }, tempPassword }
  })

  app.put<{ Params: { id: string } }>('/api/super/restaurantes/:id', async (request, reply) => {
    const id = parseInt(request.params.id)
    const data = request.body as any
    const r = await Restaurante.update(id, data)
    if (!r) return reply.status(404).send({ error: 'No encontrado' })
    return r
  })

  app.delete<{ Params: { id: string } }>('/api/super/restaurantes/:id', async (request, reply) => {
    const id = parseInt(request.params.id)
    await Restaurante.remove(id)
    return { success: true }
  })
}
