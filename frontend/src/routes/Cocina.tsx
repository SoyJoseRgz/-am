import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { socket } from '../services/socket'

interface ModInfo { id: number; nombre: string; precio: string }
interface ItemInfo {
  id: number; platillo_id: number; nombre: string
  cantidad: number; precio_unitario: string
  estado: string; notas: string | null
  modificadores: ModInfo[]
}
interface PedidoInfo {
  id: number; mesa_id: number; mesa_numero: number
  comensal_nombre: string | null; created_at: string
  items: ItemInfo[]
}

const ESTADOS = ['pendiente', 'preparando', 'listo', 'entregado'] as const
const ESTADO_LABEL: Record<string, string> = { pendiente: 'Pendiente', preparando: 'Preparando', listo: 'Listo', entregado: 'Entregado' }
const ESTADO_DOT: Record<string, string> = { pendiente: 'bg-yellow-400', preparando: 'bg-blue-400', listo: 'bg-green-400', entregado: 'bg-gray-300' }

export default function Cocina() {
  const navigate = useNavigate()
  const [pedidos, setPedidos] = useState<PedidoInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [kanban, setKanban] = useState(true)

  function cargar() {
    api<PedidoInfo[]>('/api/cocina/pedidos')
      .then(d => { setPedidos(d); setLoading(false) })
      .catch(() => { setLoading(false) })
  }

  useEffect(() => {
    cargar()
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const restauranteId = user.restaurante_id
    if (restauranteId) socket.emit('join:restaurante', restauranteId)
    const h = () => cargar()
    socket.on('pedido:nuevo', h)
    socket.on('item:actualizado', h)
    return () => {
      socket.off('pedido:nuevo', h); socket.off('item:actualizado', h)
      if (restauranteId) socket.emit('leave:restaurante', restauranteId)
    }
  }, [])

  async function avanzar(item: ItemInfo) {
    const sig: Record<string, string> = { pendiente: 'preparando', preparando: 'listo', listo: 'entregado' }
    const s = sig[item.estado]
    if (!s) return
    try { await api(`/api/cocina/pedidos/0/items/${item.id}`, { method: 'PUT', body: JSON.stringify({ estado: s }) }) } catch {}
  }

  const activos = pedidos.filter(p => p.items.some(i => i.estado !== 'entregado'))
  const completados = pedidos.filter(p => p.items.every(i => i.estado === 'entregado'))

  const agrupados = ESTADOS.reduce((acc, est) => {
    acc[est] = pedidos.flatMap(p => p.items.map(i => ({ ...i, mesa_numero: p.mesa_numero }))).filter(i => i.estado === est)
    return acc
  }, {} as Record<string, (ItemInfo & { mesa_numero: number })[]>)

  if (loading) return <div className="min-h-screen bg-white text-black flex items-center justify-center"><p className="text-gray-500">Cargando pedidos...</p></div>

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Cocina</h1>
          <div className="flex gap-2">
            <button onClick={() => setKanban(!kanban)} className={`text-xs px-3 py-1 rounded-full border ${kanban ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-500'}`}>
              {kanban ? 'Kanban' : 'Por mesa'}
            </button>
            <button onClick={() => { localStorage.clear(); navigate('/login') }} className="text-sm text-gray-400 hover:text-black">Cerrar sesión</button>
          </div>
        </div>

        {activos.length === 0 && completados.length === 0 && (
          <p className="text-gray-400 text-center py-8">No hay pedidos aún</p>
        )}

        {kanban ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ESTADOS.filter(e => e !== 'entregado').map(est => (
              <div key={est}>
                <h3 className="font-semibold text-sm mb-3 text-gray-500">{ESTADO_LABEL[est]} ({agrupados[est].length})</h3>
                <div className="space-y-2">
                  {agrupados[est].length === 0 && <p className="text-xs text-gray-300 italic">Sin {ESTADO_LABEL[est].toLowerCase()}</p>}
                  {agrupados[est].map(item => (
                    <button key={item.id} onClick={() => avanzar(item)}
                      className={`w-full text-left bg-white border border-gray-200 rounded-md p-3 border-l-4 hover:shadow-md transition ${
                        est === 'pendiente' ? 'border-l-yellow-500' : est === 'preparando' ? 'border-l-blue-500' : 'border-l-green-500'
                      }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm">Mesa {item.mesa_numero}</p>
                          <p className="text-sm mt-0.5">{item.cantidad > 1 && <span className="text-gray-400">{item.cantidad}x </span>}{item.nombre}</p>
                          {item.modificadores.length > 0 && <p className="text-gray-400 text-xs mt-0.5">{item.modificadores.map(m => m.nombre).join(', ')}</p>}
                          {item.notas && <p className="text-orange-600 text-xs mt-0.5 italic">Nota: {item.notas}</p>}
                        </div>
                        <span className={`shrink-0 w-2.5 h-2.5 rounded-full mt-1 ${ESTADO_DOT[est]}`} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activos.map(p => (
                <PedidoCard key={p.id} pedido={p} onAvanzar={avanzar} />
              ))}
            </div>
            {completados.length > 0 && (
              <>
                <h2 className="text-lg font-semibold text-gray-500 mt-8">Entregados</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-60">
                  {completados.map(p => <PedidoCard key={p.id} pedido={p} onAvanzar={avanzar} />)}
                </div>
              </>
            )}
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
        <div><span className="font-bold">Mesa {pedido.mesa_numero}</span><span className="text-gray-400 text-sm ml-2">#{pedido.id}</span></div>
        <span className="text-xs text-gray-400">{tiempo}</span>
      </div>
      <div className="p-4 space-y-3">
        {pedido.items.map(item => (
          <div key={item.id} className="flex items-start gap-3">
            <button onClick={() => onAvanzar(item)}
              className={`shrink-0 w-3 h-3 mt-1 rounded-full border-2 transition cursor-pointer ${
                item.estado === 'pendiente' ? 'bg-yellow-400 border-yellow-500' :
                item.estado === 'preparando' ? 'bg-blue-400 border-blue-500' :
                item.estado === 'listo' ? 'bg-green-400 border-green-500' : 'bg-gray-300 border-gray-400'
              }`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <p className="font-medium text-sm">{item.cantidad > 1 && <span className="text-gray-400">{item.cantidad}x </span>}{item.nombre}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                  item.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                  item.estado === 'preparando' ? 'bg-blue-100 text-blue-800' :
                  item.estado === 'listo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                }`}>{ESTADO_LABEL[item.estado]}</span>
              </div>
              {item.modificadores.length > 0 && <p className="text-gray-400 text-xs mt-0.5">{item.modificadores.map(m => m.nombre).join(', ')}</p>}
              {item.notas && <p className="text-orange-600 text-xs mt-0.5 italic">Nota: {item.notas}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
