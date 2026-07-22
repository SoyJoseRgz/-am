import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { connectToRestaurante, socket } from '../services/socket'
import { ITEM_ESTADO_LABEL as ESTADO_LABEL, ITEM_ESTADO_BORDER as ESTADO_COLOR, ITEM_ESTADO_DOT as ESTADO_DOT, ITEM_ESTADO_BG as ESTADO_BG, ESTADOS_ITEM as ESTADOS } from '../constants/estados'

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


export default function MeseroKanban({ restauranteId, onClose }: { restauranteId: number; onClose: () => void }) {
  const [pedidos, setPedidos] = useState<PedidoInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [selItem, setSelItem] = useState<ItemInfo | null>(null)

  function cargar() {
    api<PedidoInfo[]>('/api/cocina/pedidos')
      .then(d => { setPedidos(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    cargar()
    connectToRestaurante(restauranteId)
    const h = () => cargar()
    socket.on('pedido:nuevo', h)
    socket.on('item:actualizado', h)
    return () => {
      socket.off('pedido:nuevo', h)
      socket.off('item:actualizado', h)
      socket.emit('leave:restaurante', restauranteId)
    }
  }, [restauranteId])

  async function setEstado(item: ItemInfo, estado: string) {
    setSelItem(null)
    if (item.estado === estado) return
    try {
      await api(`/api/cocina/pedidos/0/items/${item.id}`, { method: 'PUT', body: JSON.stringify({ estado }) })
    } catch {}
  }

  const items = pedidos.flatMap(p => p.items.map(i => ({ ...i, mesa_numero: p.mesa_numero })))

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
              <h3 className="font-semibold text-sm mb-3 text-gray-500">{ESTADO_LABEL[est]} ({agrupados[est].length})</h3>
              <div className="space-y-2">
                {agrupados[est].length === 0 && <p className="text-xs text-gray-300 italic">Sin {ESTADO_LABEL[est].toLowerCase()}</p>}
                {agrupados[est].map(item => (
                  <button key={item.id} onClick={() => setSelItem(item)}
                    className={`w-full text-left bg-white border border-gray-200 rounded-md p-3 border-l-4 ${ESTADO_COLOR[est]} hover:shadow-md transition`}>
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
        {agrupados.entregado.length > 0 && (
          <details className="mt-8">
            <summary className="text-sm text-gray-400 cursor-pointer">Entregados ({agrupados.entregado.length})</summary>
            <div className="space-y-2 mt-3 opacity-60">
              {agrupados.entregado.map(item => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-md p-3 border-l-4 border-l-gray-300">
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 w-2.5 h-2.5 rounded-full mt-1 bg-gray-300" />
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

      {selItem && (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setSelItem(null)}>
          <div className="absolute bottom-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 shadow-xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-bold">Mesa {selItem.mesa_numero}</p>
                <p className="text-lg font-semibold mt-1">{selItem.cantidad > 1 && <span className="text-gray-400">{selItem.cantidad}x </span>}{selItem.nombre}</p>
                {selItem.modificadores.length > 0 && <p className="text-gray-400 text-sm mt-1">{selItem.modificadores.map(m => m.nombre).join(', ')}</p>}
                {selItem.notas && <p className="text-orange-600 text-sm mt-1 italic">Nota: {selItem.notas}</p>}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${ESTADO_BG[selItem.estado]}`}>{ESTADO_LABEL[selItem.estado]}</span>
            </div>
            <p className="text-sm text-gray-500 font-medium">Cambiar estado:</p>
            <div className="grid grid-cols-2 gap-2">
              {ESTADOS.map(est => (
                <button key={est} onClick={() => setEstado(selItem, est)}
                  disabled={selItem.estado === est}
                  className={`py-2.5 rounded-md text-sm font-medium transition ${
                    selItem.estado === est
                      ? `${ESTADO_BG[est]} cursor-default`
                      : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                  }`}>
                  {ESTADO_LABEL[est]}
                </button>
              ))}
            </div>
            <button onClick={() => setSelItem(null)} className="w-full text-gray-400 text-sm py-2">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}
