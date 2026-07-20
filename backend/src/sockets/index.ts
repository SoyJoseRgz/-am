import { Server as SocketIOServer } from 'socket.io'
import type { FastifyInstance } from 'fastify'

export function setupSocketIO(app: FastifyInstance) {
  const io = new SocketIOServer(app.server, {
    cors: { origin: true },
  })

  io.on('connection', (socket) => {
    socket.on('join:mesa', ({ restauranteId, mesaId }: { restauranteId: number; mesaId: number }) => {
      socket.join(`room:mesa:${restauranteId}:${mesaId}`)
    })

    socket.on('leave:mesa', ({ restauranteId, mesaId }: { restauranteId: number; mesaId: number }) => {
      socket.leave(`room:mesa:${restauranteId}:${mesaId}`)
    })

    socket.on('join:restaurante', (restauranteId: number) => {
      socket.join(`room:restaurante:${restauranteId}`)
    })

    socket.on('leave:restaurante', (restauranteId: number) => {
      socket.leave(`room:restaurante:${restauranteId}`)
    })
  })

  app.decorate('io', io)
}

declare module 'fastify' {
  interface FastifyInstance {
    io: SocketIOServer
  }
}
