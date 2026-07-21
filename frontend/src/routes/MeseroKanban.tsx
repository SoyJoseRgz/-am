import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { socket } from '../services/socket'

interface ModInfo { id: number; nombre: string; precio: string }
interface ItemInfo {
  id: number; platillo_id: number; nombre: string
  cantidad: number; precio_unitario: string
  estado: string; notas: string | null
  modificadores: ModInfo[]; mesa_numero: number
}
interface PedidoInfo {
  id: number; mesa_id: number; mesa_numero: number
  comensal_nombre: string | null; created_at: string
  items: ItemInfo[]
}

const ESTADOS = ['pendiente', 'preparando', 'listo', 'entregado'] as const
const ESTADO_LABEL: Record<string, string> = { pendiente: 'Pendiente', preparando: 'Preparando', listo: 'Listo', entregado: 'Entregado' }
const ESTADO_COLOR: Record<string, string> = { pendiente: 'border-l-yellow-500', preparando: 'border-l-blue-500', listo: 'border-l-green-500', entregado: 'border-l-gray-300' }
const ESTADO_DOT: Record<string, string> = { pendiente: 'bg-yellow-400', preparando: 'bg-blue-400', listo: 'bg-green-400', entregado: 'bg-gray-300' }

export default function MeseroKanban({ restauranteId, onClose }: { restauranteId: number; onClose: () => void }) {
  const [pedidos, setPedidos] = useState<PedidoInfo[]>([])
  const [loading, setLoading] = useState(true)

  function cargar() {
    api<PedidoInfo[]>('/api/cocina/pedidos')
      .then(d => { setPedidos(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    cargar()
    socket.emit('join:restaurante', restauranteId)
    const h = () => cargar()
    socket.on('pedido:nuevo', h)
    socket.on('item:actualizado', h)
    return () => {
      socket.off('pedido:nuevo', h)
      socket.off('item:actualizado', h)
      socket.emit('leave:restaurante', restauranteId)
    }
  }, [restauranteId])

  async function avanzar(item: ItemInfo) {
    const sig: Record<string, string> = { pendiente: 'preparando', preparando: 'listo', listo: 'entregado' }
    const s = sig[item.estado]
    if (!s) return
    try {
      await api(`/api/cocina/pedidos/0/items/${item.id}`, { method: 'PUT', body: JSON.stringify({ estado: s }) })
    } catch {}
  }

  const items = pedidos.flatMap(p =>
    p.items.map(i => ({ ...i, mesa_numero: p.mesa_numero }))
  )

  const agrupados = ESTADOS.reduce((acc, est) => {
    acc[est] = items.filter(i => i.estado === est)
    return acc
  }, {} as Record<string, ItemInfo[]>)

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando...</div>

  return (
    <div className="h-full flex flex-col">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
        <span className="font-bold text-lg">Pedidos</span>
        <button onClick={onClose} className="text-gray-400 hover:text-black text-xl">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ESTADOS.filter(e => e !== 'entregado').map(est => (
            <div key={est}>
              <h3 className="font-semibold text-sm mb-3 text-gray-500">
                {ESTADO_LABEL[est]} ({agrupados[est].length})
              </h3>
              <div className="space-y-2">
                {agrupados[est].length === 0 && (
                  <p className="text-xs text-gray-300 italic">Sin {ESTADO_LABEL[est].toLowerCase()}</p>
                )}
                {agrupados[est].map(item => (
                  <button
                    key={item.id}
                    onClick={() => avanzar(item)}
                    className={`w-full text-left bg-white border border-gray-200 rounded-md p-3 border-l-4 ${ESTADO_COLOR[est]} hover:shadow-md transition`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">Mesa {item.mesa_numero}</p>
                        <p className="text-sm mt-0.5">
                          {item.cantidad > 1 && <span className="text-gray-400">{item.cantidad}x </span>}
                          {item.nombre}
                        </p>
                        {item.modificadores.length > 0 && (
                          <p className="text-gray-400 text-xs mt-0.5">{item.modificadores.map(m => m.nombre).join(', ')}</p>
                        )}
                        {item.notas && (
                          <p className="text-orange-600 text-xs mt-0.5 italic">Nota: {item.notas}</p>
                        )}
                      </div>
                      <span className={`shrink-0 w-2.5 h-2.5 rounded-full mt-1 ${ESTADO_DOT[est]}`} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {agrupados.entregado.length > 0 && (
          <details className="mt-8">
            <summary className="text-sm text-gray-400 cursor-pointer">Entregados ({agrupados.entregado.length})</summary>
            <div className="space-y-2 mt-3 opacity-60">
              {agrupados.entregado.map(item => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-md p-3 border-l-4 border-l-gray-300">
                  <div className="flex items-start gap-2">
                    <span className={`shrink-0 w-2.5 h-2.5 rounded-full mt-1 bg-gray-300`} />
                    <div>
                      <p className="font-bold text-sm">Mesa {item.mesa_numero}</p>
                      <p className="text-sm">{item.cantidad}x {item.nombre}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}
