import { io } from 'socket.io-client'

const socket = io('/', { autoConnect: false })

export function connectToMesa(restauranteId: number, mesaId: number) {
  const doJoin = () => socket.emit('join:mesa', { restauranteId, mesaId })
  if (socket.connected) {
    doJoin()
  } else {
    socket.once('connect', doJoin)
    if (!socket.connected) socket.connect()
  }
}

export function connectToRestaurante(restauranteId: number) {
  const doJoin = () => socket.emit('join:restaurante', restauranteId)
  if (socket.connected) {
    doJoin()
  } else {
    socket.once('connect', doJoin)
    if (!socket.connected) socket.connect()
  }
}

export { socket }
