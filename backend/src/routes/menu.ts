import type { FastifyInstance } from 'fastify'
import { getMenu } from '../models/menu.js'

export default async function menuRoutes(app: FastifyInstance) {
  app.get('/api/restaurantes/:id/menu', async (request, reply) => {
    const { id } = request.params as { id: string }
    const restauranteId = Number(id)
    if (!restauranteId) return reply.status(400).send({ error: 'ID inválido' })

    const menu = await getMenu(restauranteId)
    return { categorias: menu }
  })
}
