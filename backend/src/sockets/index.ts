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

    socket.on('join:restaurante', (data: number | { restauranteId: number }) => {
      const id = typeof data === 'number' ? data : data.restauranteId
      socket.join(`room:restaurante:${id}`)
    })

    socket.on('leave:restaurante', (data: number | { restauranteId: number }) => {
      const id = typeof data === 'number' ? data : data.restauranteId
      socket.leave(`room:restaurante:${id}`)
    })
  })

  app.decorate('io', io)
}

declare module 'fastify' {
  interface FastifyInstance {
    io: SocketIOServer
  }
}
