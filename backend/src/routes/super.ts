import type { FastifyInstance } from 'fastify'
import { hashPassword } from '../services/auth.js'
import * as Restaurante from '../models/restaurante.js'
import * as Usuario from '../models/usuario.js'

export default async function superRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)
  app.addHook('preHandler', app.requireRol('super_admin'))

  app.get('/super/restaurantes', async () => {
    const restaurantes = await Restaurante.findAll()
    return { restaurantes }
  })

  app.post('/super/restaurantes', async (request, reply) => {
    const { nombre, slug, direccion, telefono, adminCelular, adminNombre } = request.body as {
      nombre: string
      slug: string
      direccion?: string
      telefono?: string
      adminCelular: string
      adminNombre: string
    }

    if (!nombre || !slug || !adminCelular || !adminNombre) {
      return reply.status(400).send({ error: 'nombre, slug, adminCelular y adminNombre requeridos' })
    }

    const restaurante = await Restaurante.create({ nombre, slug, direccion, telefono })

    const tempPassword = Math.random().toString(36).slice(-8)
    const password_hash = await hashPassword(tempPassword)
    const admin = await Usuario.create({
      restaurante_id: restaurante.id,
      celular: adminCelular,
      password_hash,
      nombre: adminNombre,
      rol: 'admin',
      force_password_change: true,
    })

    app.log.info({ celular: adminCelular, tempPassword }, 'Credenciales admin generadas')

    return {
      restaurante,
      admin: { id: admin.id, nombre: admin.nombre, celular: admin.celular, force_password_change: true },
      tempPassword,
    }
  })
}
