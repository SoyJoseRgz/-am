import type { FastifyInstance } from 'fastify'
import { getMenu } from '../models/menu.js'
import { findById } from '../models/restaurante.js'

export default async function menuRoutes(app: FastifyInstance) {
  app.get('/api/restaurantes/:id/menu', async (request, reply) => {
    const { id } = request.params as { id: string }
    const restauranteId = Number(id)
    if (!restauranteId) return reply.status(400).send({ error: 'ID inválido' })

    const [menu, restaurante] = await Promise.all([
      getMenu(restauranteId),
      findById(restauranteId),
    ])
    return {
      categorias: menu,
      iva_porcentaje: Number(restaurante?.iva_porcentaje || 16),
      iva_incluido: restaurante?.iva_incluido ?? true,
      deposito_info: (restaurante as any)?.deposito_info || null,
    }
  })
}
