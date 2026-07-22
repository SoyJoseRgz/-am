import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCart } from '../stores/CartContext'
import { api, getCurrentUser } from '../services/api'

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
      .then(d => {
        setIvaPct(d.iva_porcentaje)
        setIvaIncluido(d.iva_incluido)
      })
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
      const pedido = await api<any>('/api/pedidos', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      clearCart()
      setSuccess(pedido.id)
    } catch (e: any) {
      setError(e.message || 'Error al crear pedido')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    if (props?.onSuccess) {
      props.onSuccess(success)
      return null
    }
    navigate(`/m/${restauranteId}/${mesaId}/pedido`, { replace: true })
    return null
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-md mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => { if (props?.onClose) props.onClose(); else navigate(-1) }} className="text-gray-400 hover:text-black text-sm">← Volver</button>
          <h1 className="text-lg font-bold">Pre-pedido</h1>
          <div />
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No hay items en el carrito</p>
            <button
              onClick={() => { if (props?.onClose) props.onClose(); else navigate(`/m/${restauranteId}/${mesaId}`) }}
              className="bg-black hover:bg-gray-800 text-white px-6 py-2 rounded-md text-sm"
            >
              Ver menú
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {itemsPorComensal.map(grupo => (
                <div key={grupo.usuarioId} className="bg-gray-50 border border-gray-200 rounded-md p-3">
                  <h3 className="font-semibold text-sm text-gray-500 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">
                      {grupo.usuarioNombre[0]}
                    </span>
                    {grupo.usuarioNombre}
                  </h3>
                  <div className="space-y-2">
                    {grupo.items.map((item, i) => {
                      const idx = items.findIndex(it =>
                        it.platilloId === item.platilloId &&
                        it.usuarioId === item.usuarioId &&
                        JSON.stringify(it.modificadores) === JSON.stringify(item.modificadores) &&
                        it.notas === item.notas
                      )
                      const itemTotal = (item.precioUnitario + item.modificadores.reduce((s, m) => s + m.precio, 0)) * item.cantidad
                      return (
                        <div key={`${grupo.usuarioId}-${i}`} className="bg-white border border-gray-200 rounded-md p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{item.nombre}</p>
                              {item.modificadores.length > 0 && (
                                <p className="text-gray-400 text-xs mt-0.5">
                                  {item.modificadores.map(m => m.nombre).join(', ')}
                                </p>
                              )}
                              {item.notas && (
                                <p className="text-gray-400 text-xs italic mt-0.5">📝 {item.notas}</p>
                              )}
                            </div>
                            <p className="font-bold text-sm">${itemTotal.toFixed(2)}</p>
                          </div>
                          {grupo.usuarioId === usuarioId && (
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex items-center border border-gray-200 rounded-md">
                                <button
                                  onClick={() => updateCantidad(idx, -1)}
                                  className="px-2 py-1 text-sm hover:bg-gray-50"
                                >
                                  −
                                </button>
                                <span className="px-3 text-sm font-medium">{item.cantidad}</span>
                                <button
                                  onClick={() => updateCantidad(idx, 1)}
                                  className="px-2 py-1 text-sm hover:bg-gray-50"
                                >
                                  +
                                </button>
                              </div>
                              <button
                                onClick={() => removeItem(idx)}
                                className="text-xs text-red-500 hover:text-red-700 ml-auto"
                              >
                                Eliminar
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

            <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {!ivaIncluido && (
                <div className="flex justify-between">
                  <span className="text-gray-500">IVA ({ivaPct}%)</span>
                  <span>${ivaMonto.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400 py-3 rounded-md font-semibold transition text-white"
            >
              {submitting ? 'Enviando...' : 'Confirmar pedido'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
