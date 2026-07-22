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
  const [ivaPct, setIvaPct] = useState(16)
  const [ivaIncluido, setIvaIncluido] = useState(true)
  const [split, setSplit] = useState<'individual' | 'iguales' | 'yo_invito'>('individual')
  const [yoInvitaIdx, setYoInvitaIdx] = useState(0)
  const [tip, setTip] = useState(0)

  useEffect(() => {
    api<{ iva_porcentaje: number; iva_incluido: boolean }>(`/api/restaurantes/${restauranteId}/menu`)
      .then(d => { setIvaPct(d.iva_porcentaje); setIvaIncluido(d.iva_incluido) })
      .catch(() => {})
  }, [restauranteId])

  const groups: Record<number, { nombre: string; items: ItemData[]; subtotal: number }> = {}
  for (const item of itemsDelDia) {
    const uid = item.usuario_id
    if (!groups[uid]) groups[uid] = { nombre: item.comensal_nombre || 'Comensal', items: [], subtotal: 0 }
    groups[uid].items.push(item)
    groups[uid].subtotal += Number(item.precio_unitario) * item.cantidad
  }
  const personas = Object.values(groups)
  const total = personas.reduce((s, p) => s + p.subtotal, 0)
  const iva = ivaIncluido
    ? total - total / (1 + ivaPct / 100)
    : total * ivaPct / 100
  const totalConIva = ivaIncluido ? total : total + iva
  const tipAmount = totalConIva * tip / 100
  const granTotal = totalConIva + tipAmount
  const porPersona = split === 'iguales' && personas.length > 0 ? granTotal / personas.length : 0

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
        body: JSON.stringify({ tipo: 'cuenta', restaurante_id: Number(restauranteId), split, tip }),
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

            <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
              {personas.map((p, i) => (
                <div key={i} className="flex justify-between text-gray-500">
                  <span>{p.nombre}</span>
                  <span>${p.subtotal.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between text-gray-500">
                <span>IVA ({ivaPct}%)</span>
                <span>${iva.toFixed(2)}</span>
              </div>
              {tip > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Propina ({tip}%)</span>
                  <span>${tipAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
                <span>Total</span>
                <span>${granTotal.toFixed(2)}</span>
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">Dividir cuenta</div>
              <div className="flex gap-2">
                {(['individual', 'iguales', 'yo_invito'] as const).map(s => (
                  <button key={s} onClick={() => setSplit(s)}
                    className={`flex-1 py-2 rounded-md text-xs border ${split === s ? 'bg-black text-white border-black' : 'border-gray-200'}`}>
                    {s === 'individual' ? 'Individual' : s === 'iguales' ? 'Iguales' : 'Yo invito'}
                  </button>
                ))}
              </div>
              {split === 'individual' && (
                <div className="border border-gray-200 rounded-md p-3 text-sm mt-2 space-y-1">
                  {personas.map((p, i) => {
                    const ivaShare = (p.subtotal / total) * iva
                    const tipShare = (p.subtotal / total) * tipAmount
                    return (
                      <div key={i} className="flex justify-between">
                        <span>{p.nombre}</span>
                        <span>${(p.subtotal + ivaShare + tipShare).toFixed(2)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
              {split === 'iguales' && (
                <div className="border border-gray-200 rounded-md p-3 text-sm mt-2 flex justify-between">
                  <span>Cada quien</span>
                  <span className="font-semibold">${porPersona.toFixed(2)}</span>
                </div>
              )}
              {split === 'yo_invito' && (
                <div className="mt-2 space-y-2">
                  <div className="text-xs text-gray-400 uppercase tracking-wide font-semibold">¿Quién invita?</div>
                  <div className="flex gap-2 flex-wrap">
                    {personas.map((p, i) => (
                      <button key={i} onClick={() => setYoInvitaIdx(i)}
                        className={`px-4 py-2 rounded-md text-xs border ${yoInvitaIdx === i ? 'bg-black text-white border-black' : 'border-gray-200'}`}>
                        {p.nombre}
                      </button>
                    ))}
                  </div>
                  <div className="border border-gray-200 rounded-md p-3 text-sm space-y-1">
                    {personas.map((p, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{p.nombre}</span>
                        <span className={i === yoInvitaIdx ? 'font-semibold' : 'text-gray-400'}>
                          {i === yoInvitaIdx ? `$${granTotal.toFixed(2)}` : '$0.00'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 items-center">
              <span className="text-xs text-gray-500">Propina:</span>
              {[0, 10, 15, 20].map(t => (
                <button key={t} onClick={() => setTip(t)}
                  className={`px-3 py-1 rounded-md text-xs border ${tip === t ? 'bg-black text-white border-black' : 'border-gray-200'}`}>
                  {t}%
                </button>
              ))}
            </div>

            <button
              onClick={pedirCuenta}
              disabled={cuentaEnviando || cuentaEnviada || personas.length === 0}
              className={`w-full py-3 rounded-md font-semibold transition ${
                cuentaEnviada
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-black hover:bg-gray-800 text-white'
              }`}
            >
              {cuentaEnviada ? '✓ Cuenta solicitada' : `Pedir cuenta — $${granTotal.toFixed(2)}`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
