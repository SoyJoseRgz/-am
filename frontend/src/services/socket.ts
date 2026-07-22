import { io } from 'socket.io-client'

const socket = io('/', { autoConnect: false })

export function connectToMesa(restauranteId: number, mesaId: number) {
  const doJoin = () => socket.emit('join:mesa', { restauranteId, mesaId })
  socket.on('connect', doJoin)
  if (socket.connected) {
    doJoin()
  } else {
    socket.connect()
  }
}

export function connectToRestaurante(restauranteId: number) {
  const doJoin = () => socket.emit('join:restaurante', restauranteId)
  socket.on('connect', doJoin)
  if (socket.connected) {
    doJoin()
  } else {
    socket.connect()
  }
}

export function leaveMesa(restauranteId: number, mesaId: number) {
  socket.emit('leave:mesa', { restauranteId, mesaId })
}

export function leaveRestaurante(restauranteId: number) {
  socket.emit('leave:restaurante', restauranteId)
}

export { socket }
