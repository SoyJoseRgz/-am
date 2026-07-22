import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, getCurrentUser } from '../services/api'
import { connectToMesa, socket } from '../services/socket'
import { ITEM_ESTADO_LABEL, ITEM_ESTADO_COLOR, ITEM_ESTADO_BORDER, ESTADOS_ITEM as ESTADOS } from '../constants/estados'

interface ItemData {
  id: number
  pedido_id: number
  platillo_id: number
  usuario_id: number
  cantidad: number
  precio_unitario: string
  estado: string
  notas: string | null
  nombre: string
  comensal_nombre: string
  modificadores: { id: number; nombre: string; precio: string }[]
}

interface PedidoData {
  id: number
  mesa_id: number
  usuario_id: number
  estado: string
  created_at: string
  comensal_nombre: string
  items: ItemData[]
}

export default function PedidoActivo(props?: { restauranteId?: string; mesaId?: string; onClose?: () => void; onSumarMas?: () => void }) {
  const params = useParams()
  const restauranteId = props?.restauranteId || params.restauranteId
  const mesaId = props?.mesaId || params.mesaId
  const navigate = useNavigate()
  const [pedidos, setPedidos] = useState<PedidoData[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelandoId, setCancelandoId] = useState<number | null>(null)

  function cargar() {
    if (!mesaId || !restauranteId) return
    api<PedidoData[] | { error: string }>(`/api/pedidos/mesa/${mesaId}`)
      .then(data => {
        const arr = Array.isArray(data) ? data : []
        setPedidos(arr)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    cargar()
    connectToMesa(Number(restauranteId), Number(mesaId))

    socket.on('item:actualizado', () => {
      cargar()
    })
    socket.on('pedido:creado', () => {
      cargar()
    })

    return () => {
      socket.off('item:actualizado')
      socket.off('pedido:creado')
    }
  }, [mesaId, restauranteId])

    const user = getCurrentUser()

  const itemsDelDia = pedidos.flatMap(p => p.items)

  const agrupados = ESTADOS.reduce((acc, est) => {
    acc[est] = itemsDelDia.filter(i => i.estado === est)
    return acc
  }, {} as Record<string, ItemData[]>)

  const todosEntregados = itemsDelDia.length > 0 && itemsDelDia.every(i => i.estado === 'entregado')
  const [cuentaEnviando, setCuentaEnviando] = useState(false)
  const [cuentaEnviada, setCuentaEnviada] = useState(false)

  async function cancelarItem(item: ItemData) {
    setCancelandoId(item.id)
    try {
      await api(`/api/pedidos/${item.pedido_id}/items/${item.id}/cancelar`, { method: 'PUT' })
    } catch {}
    setCancelandoId(null)
  }

  async function pedirCuenta() {
    setCuentaEnviando(true)
    try {
      await api(`/api/llamados/mesa/${mesaId}`, {
        method: 'POST',
        body: JSON.stringify({ tipo: 'cuenta', restaurante_id: Number(restauranteId) }),
      })
      setCuentaEnviada(true)
    } catch {}
    setCuentaEnviando(false)
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-md mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => { if (props?.onClose) props.onClose(); else navigate(`/m/${restauranteId}/${mesaId}`) }} className="text-gray-400 hover:text-black text-sm">
            ← Volver
          </button>
          <h1 className="text-lg font-bold">Mi pedido</h1>
          <div />
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-8">Cargando...</p>
        ) : itemsDelDia.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No hay pedidos activos</p>
            <button
              onClick={() => { if (props?.onSumarMas) props.onSumarMas(); else navigate(`/m/${restauranteId}/${mesaId}`, { state: { openMenu: true } }) }}
              className="bg-black hover:bg-gray-800 text-white px-6 py-2 rounded-md text-sm"
            >
              Ver menú
            </button>
          </div>
        ) : (
          <>
            {ESTADOS.map(est => {
              const list = agrupados[est]
              if (list.length === 0) return null
              return (
                <div key={est}>
                  <div className={`text-xs font-semibold mb-2 px-2 py-1 rounded-md inline-block ${ITEM_ESTADO_COLOR[est]} bg-gray-50`}>
                    {ITEM_ESTADO_LABEL[est]} ({list.length})
                  </div>
                  <div className="space-y-2">
                    {list.map(item => (
                      <div key={item.id} className={`bg-white border border-gray-200 rounded-md p-3 border-l-4 ${ITEM_ESTADO_BORDER[est]}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{item.nombre}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {item.comensal_nombre || 'Comensal'}
                              {item.cantidad > 1 && ` ×${item.cantidad}`}
                            </p>
                            {item.modificadores.length > 0 && (
                              <p className="text-gray-400 text-xs mt-0.5">
                                {item.modificadores.map(m => m.nombre).join(', ')}
                              </p>
                            )}
                            {item.notas && (
                              <p className="text-gray-400 text-xs italic mt-0.5">📝 {item.notas}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {item.estado === 'pendiente' && item.usuario_id === user.id && (
                              <button
                                onClick={() => cancelarItem(item)}
                                disabled={cancelandoId === item.id}
                                className="text-xs text-red-400 hover:text-red-600 disabled:text-gray-300"
                              >
                                {cancelandoId === item.id ? '...' : 'Cancelar'}
                              </button>
                            )}
                            <span className={`text-xs font-medium ${ITEM_ESTADO_COLOR[est]}`}>
                              {ITEM_ESTADO_LABEL[est]}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {todosEntregados && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4 text-center">
                <p className="text-green-700 text-sm font-medium">Todo entregado ✨</p>
                <p className="text-green-600 text-xs mt-1">¿Quieres algo más?</p>
              </div>
            )}

            <button
              onClick={() => { if (props?.onSumarMas) props.onSumarMas(); else navigate(`/m/${restauranteId}/${mesaId}`, { state: { openMenu: true } }) }}
              className="w-full bg-black hover:bg-gray-800 text-white py-3 rounded-md font-semibold transition"
            >
              Sumar más
            </button>

            <button
              onClick={pedirCuenta}
              disabled={cuentaEnviando || cuentaEnviada}
              className={`w-full border py-3 rounded-md font-semibold transition ${
                cuentaEnviada
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {cuentaEnviada ? '✓ Cuenta solicitada' : 'Pedir cuenta'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
