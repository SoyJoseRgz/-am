import { io } from 'socket.io-client'

const socket = io('/', { autoConnect: false })

export function connectToMesa(restauranteId: number, mesaId: number) {
  if (!socket.connected) socket.connect()
  socket.emit('join:mesa', { restauranteId, mesaId })
}

export function connectToRestaurante(restauranteId: number) {
  if (!socket.connected) socket.connect()
  socket.emit('join:restaurante', { restauranteId })
}

export function leaveMesa(restauranteId: number, mesaId: number) {
  socket.emit('leave:mesa', { restauranteId, mesaId })
}

export { socket }
