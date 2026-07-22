import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCart } from '../stores/CartContext'
import { api, getCurrentUser } from '../services/api'
import { Minus, Plus, Trash2 } from 'lucide-react'

export default function PrePedido(props?: { restauranteId?: string; mesaId?: string; onSuccess?: (pedidoId: number) => void; onClose?: () => void }) {
  const params = useParams()
  const restauranteId = props?.restauranteId || params.restauranteId
  const mesaId = props?.mesaId || params.mesaId
  const navigate = useNavigate()
  const { items, itemsPorComensal, removeItem, updateCantidad, clearCart, totalSinIVA } = useCart()
  const [ivaPct, setIvaPct] = useState(16)
  const [ivaIncluido, setIvaIncluido] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<number | null>(null)
  const [error, setError] = useState('')

  const currentUser = getCurrentUser()
  const usuarioId = currentUser.id || 0

  useEffect(() => {
    api<{ iva_porcentaje: number; iva_incluido: boolean }>(`/api/restaurantes/${restauranteId}/menu`)
      .then(d => { setIvaPct(d.iva_porcentaje); setIvaIncluido(d.iva_incluido) })
      .catch(() => {})
  }, [restauranteId])

  const subtotal = totalSinIVA
  const ivaMonto = ivaIncluido ? 0 : Math.round(subtotal * ivaPct * 100) / 10000
  const total = ivaIncluido ? subtotal : subtotal + ivaMonto

  async function handleConfirm() {
    if (items.length === 0) return
    setSubmitting(true)
    setError('')
    try {
      const body = {
        mesa_id: Number(mesaId),
        items: items.flatMap(i =>
          Array.from({ length: i.cantidad }, () => ({
            platillo_id: i.platilloId,
            cantidad: 1,
            precio_unitario: i.precioUnitario + i.modificadores.reduce((s, m) => s + m.precio, 0),
            notas: i.notas || undefined,
            modificador_ids: i.modificadores.map(m => m.id),
            usuario_id: i.usuarioId,
          }))
        ),
      }
      const pedido = await api<any>('/api/pedidos', { method: 'POST', body: JSON.stringify(body) })
      clearCart()
      setSuccess(pedido.id)
    } catch (e: any) {
      setError(e.message || 'Error al crear pedido')
    } finally { setSubmitting(false) }
  }

  if (success) {
    if (props?.onSuccess) { props.onSuccess(success); return null }
    navigate(`/m/${restauranteId}/${mesaId}/pedido`, { replace: true })
    return null
  }

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <p className="text-[#888] text-sm">No hay items en el carrito</p>
          <button onClick={() => { if (props?.onClose) props.onClose() }}
            className="bg-[#111] hover:bg-[#000] text-white px-6 py-2 rounded-md text-sm">Ver menú</button>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {itemsPorComensal.map(grupo => (
              <div key={grupo.usuarioId}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-[#111] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    {grupo.usuarioNombre[0]}
                  </span>
                  <span className="text-xs font-medium text-[#888] uppercase tracking-wider">{grupo.usuarioNombre}</span>
                </div>
                <div className="space-y-2">
                  {grupo.items.map((item, i) => {
                    const idx = items.findIndex(it =>
                      it.platilloId === item.platilloId && it.usuarioId === item.usuarioId &&
                      JSON.stringify(it.modificadores) === JSON.stringify(item.modificadores) && it.notas === item.notas
                    )
                    const itemTotal = (item.precioUnitario + item.modificadores.reduce((s, m) => s + m.precio, 0)) * item.cantidad
                    return (
                      <div key={`${grupo.usuarioId}-${i}`} className="bg-white border border-[#e5ddd2] rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{item.cantidad}x</span>
                              <p className="font-semibold text-sm truncate">{item.nombre}</p>
                            </div>
                            {item.modificadores.length > 0 && (
                              <p className="text-[#888] text-xs mt-0.5 ml-6">{item.modificadores.map(m => m.nombre).join(', ')}</p>
                            )}
                            {item.notas && <p className="text-[#aaa] text-xs italic mt-0.5 ml-6">📝 {item.notas}</p>}
                          </div>
                          <p className="font-semibold text-sm shrink-0">${itemTotal.toFixed(2)}</p>
                        </div>
                        {grupo.usuarioId === usuarioId && (
                          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#e5ddd2]">
                            <div className="flex items-center border border-[#e5ddd2] rounded-md overflow-hidden">
                              <button onClick={() => updateCantidad(idx, -1)} className="w-7 h-7 flex items-center justify-center hover:bg-[#faf6f2] transition-colors">
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-xs font-semibold text-center">{item.cantidad}</span>
                              <button onClick={() => updateCantidad(idx, 1)} className="w-7 h-7 flex items-center justify-center hover:bg-[#faf6f2] transition-colors">
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <button onClick={() => removeItem(idx)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors">
                              <Trash2 className="w-3 h-3" /> Quitar
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-[#e5ddd2] pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#888]">Subtotal</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            {!ivaIncluido && (
              <div className="flex justify-between text-sm">
                <span className="text-[#888]">IVA ({ivaPct}%)</span>
                <span className="font-medium">${ivaMonto.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold border-t border-[#e5ddd2] pt-3">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          {error && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>}

          <button onClick={handleConfirm} disabled={submitting}
            className="w-full h-12 text-sm bg-[#111] hover:bg-[#000] disabled:bg-[#e5ddd2] disabled:text-[#aaa] text-white rounded-lg font-semibold transition flex items-center justify-center gap-2">
            {submitting ? 'Enviando pedido…' : `Confirmar pedido — $${total.toFixed(2)}`}
          </button>
        </>
      )}
    </div>
  )
}
