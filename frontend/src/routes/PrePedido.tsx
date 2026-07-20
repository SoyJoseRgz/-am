import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCart } from '../stores/CartContext'
import { api } from '../services/api'

export default function PrePedido() {
  const { restauranteId, mesaId } = useParams()
  const navigate = useNavigate()
  const { items, removeItem, updateCantidad, clearCart, totalSinIVA } = useCart()
  const [ivaPct, setIvaPct] = useState(16)
  const [ivaIncluido, setIvaIncluido] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<number | null>(null)
  const [error, setError] = useState('')

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
    return (
      <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="text-6xl">✅</div>
          <h2 className="text-2xl font-bold">Pedido enviado</h2>
          <p className="text-gray-500">Tu pedido #<span className="font-bold text-black">{success}</span> ha sido enviado a la cocina.</p>
          <p className="text-gray-400 text-sm">El mesero te lo llevará cuando esté listo.</p>
          <button
            onClick={() => navigate(`/m/${restauranteId}/${mesaId}`)}
            className="bg-black hover:bg-gray-800 text-white px-8 py-3 rounded-md font-semibold transition"
          >
            Volver al menú
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-md mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-black text-sm">← Volver</button>
          <h1 className="text-lg font-bold">Pre-pedido</h1>
          <div />
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No hay items en el carrito</p>
            <button
              onClick={() => navigate(`/m/${restauranteId}/${mesaId}`)}
              className="bg-black hover:bg-gray-800 text-white px-6 py-2 rounded-md text-sm"
            >
              Ver menú
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {items.map((item, i) => {
                const itemTotal = (item.precioUnitario + item.modificadores.reduce((s, m) => s + m.precio, 0)) * item.cantidad
                return (
                  <div key={i} className="bg-white border border-gray-200 rounded-md p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{item.nombre}</p>
                        {item.modificadores.length > 0 && (
                          <p className="text-gray-400 text-xs mt-0.5">
                            {item.modificadores.map(m => m.nombre).join(', ')}
                          </p>
                        )}
                      </div>
                      <p className="font-bold text-sm">${itemTotal.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center border border-gray-200 rounded-md">
                        <button
                          onClick={() => updateCantidad(i, -1)}
                          className="px-2 py-1 text-sm hover:bg-gray-50"
                        >
                          −
                        </button>
                        <span className="px-3 text-sm font-medium">{item.cantidad}</span>
                        <button
                          onClick={() => updateCantidad(i, 1)}
                          className="px-2 py-1 text-sm hover:bg-gray-50"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(i)}
                        className="text-xs text-red-500 hover:text-red-700 ml-auto"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )
              })}
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
