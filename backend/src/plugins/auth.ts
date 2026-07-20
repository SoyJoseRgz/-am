import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import { verifyToken } from '../services/auth.js'

declare module 'fastify' {
  interface FastifyRequest {
    user?: { userId: number; restauranteId: number | null; rol: string }
  }
}

async function authPlugin(app: FastifyInstance) {
  app.addHook('onRequest', async (request) => {
    request.user = undefined
  })

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    const header = request.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Token requerido' })
    }
    try {
      const { payload } = await verifyToken(header.slice(7))
      request.user = payload as { userId: number; restauranteId: number | null; rol: string }
    } catch {
      return reply.status(401).send({ error: 'Token inválido o expirado' })
    }
  })

  app.decorate('requireRol', (...roles: string[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!roles.includes(request.user?.rol ?? '')) {
        return reply.status(403).send({ error: 'No autorizado' })
      }
    }
  })
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireRol: (...roles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

export default fp(authPlugin, { name: 'auth' })
