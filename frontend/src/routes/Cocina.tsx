import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { socket } from '../services/socket'

interface ModInfo {
  id: number; nombre: string; precio: string
}

interface ItemInfo {
  id: number; platillo_id: number; nombre: string
  cantidad: number; precio_unitario: string
  estado: string; notas: string | null
  modificadores: ModInfo[]
}

interface PedidoInfo {
  id: number; mesa_id: number; mesa_numero: number
  comensal_nombre: string | null
  created_at: string
  items: ItemInfo[]
}

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  preparando: 'Preparando',
  listo: 'Listo',
  entregado: 'Entregado',
}

const ESTADO_BG: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  preparando: 'bg-blue-100 text-blue-800',
  listo: 'bg-green-100 text-green-800',
  entregado: 'bg-gray-100 text-gray-500',
}

export default function Cocina() {
  const navigate = useNavigate()
  const [pedidos, setPedidos] = useState<PedidoInfo[]>([])
  const [loading, setLoading] = useState(true)

  function cargar() {
    api<PedidoInfo[]>('/api/cocina/pedidos')
      .then(d => { setPedidos(d); setLoading(false) })
      .catch(() => { setLoading(false) })
  }

  useEffect(() => {
    cargar()
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const restauranteId = user.restaurante_id
    if (restauranteId) {
      socket.emit('join:restaurante', restauranteId)
    }
    const handler = () => cargar()
    socket.on('pedido:nuevo', handler)
    socket.on('item:actualizado', handler)
    return () => {
      socket.off('pedido:nuevo', handler)
      socket.off('item:actualizado', handler)
      if (restauranteId) socket.emit('leave:restaurante', restauranteId)
    }
  }, [])

  async function avanzarEstado(item: ItemInfo) {
    const estados: Record<string, string> = { pendiente: 'preparando', preparando: 'listo', listo: 'entregado' }
    const sig = estados[item.estado]
    if (!sig) return
    try {
      await api(`/api/cocina/pedidos/0/items/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ estado: sig }),
      })
      cargar()
    } catch {}
  }

  const activos = pedidos.filter(p => p.items.some(i => i.estado !== 'entregado'))
  const completados = pedidos.filter(p => p.items.every(i => i.estado === 'entregado'))

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        <p className="text-gray-500">Cargando pedidos...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Cocina</h1>
          <button
            onClick={() => { localStorage.clear(); navigate('/login') }}
            className="text-sm text-gray-400 hover:text-black"
          >
            Cerrar sesión
          </button>
        </div>

        {activos.length === 0 && completados.length === 0 && (
          <p className="text-gray-400 text-center py-8">No hay pedidos aún</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activos.map(p => (
            <PedidoCard key={p.id} pedido={p} onAvanzar={avanzarEstado} />
          ))}
        </div>

        {completados.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-gray-500 mt-8">Entregados</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-60">
              {completados.map(p => (
                <PedidoCard key={p.id} pedido={p} onAvanzar={avanzarEstado} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function PedidoCard({ pedido, onAvanzar }: { pedido: PedidoInfo; onAvanzar: (item: ItemInfo) => void }) {
  const tiempo = new Date(pedido.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div>
          <span className="font-bold">Mesa {pedido.mesa_numero}</span>
          <span className="text-gray-400 text-sm ml-2">#{pedido.id}</span>
        </div>
        <span className="text-xs text-gray-400">{tiempo}</span>
      </div>
      <div className="p-4 space-y-3">
        {pedido.items.map(item => (
          <div key={item.id} className="flex items-start gap-3">
            <button
              onClick={() => onAvanzar(item)}
              className={`shrink-0 w-3 h-3 mt-1 rounded-full border-2 border-current transition cursor-pointer ${
                item.estado === 'pendiente' ? 'bg-yellow-400 border-yellow-500' :
                item.estado === 'preparando' ? 'bg-blue-400 border-blue-500' :
                item.estado === 'listo' ? 'bg-green-400 border-green-500' :
                'bg-gray-300 border-gray-400'
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <p className="font-medium text-sm">
                  {item.cantidad > 1 && <span className="text-gray-400">{item.cantidad}x </span>}
                  {item.nombre}
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-2 ${ESTADO_BG[item.estado] || ''}`}>
                  {ESTADO_LABEL[item.estado] || item.estado}
                </span>
              </div>
              {item.modificadores.length > 0 && (
                <p className="text-gray-400 text-xs mt-0.5">
                  {item.modificadores.map(m => m.nombre).join(', ')}
                </p>
              )}
              {item.notas && (
                <p className="text-orange-600 text-xs mt-0.5 italic">Nota: {item.notas}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
