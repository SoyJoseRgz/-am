import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { useCart } from '../stores/CartContext'
import { api, getCurrentUser } from '../services/api'

export default function PrePedido(props?: { restauranteId?: string; mesaId?: string; usuarioNombre?: string; onSuccess?: (pedidoId: number) => void; onClose?: () => void }) {
  const params = useParams()
  const restauranteId = props?.restauranteId || params.restauranteId
  const mesaId = props?.mesaId || params.mesaId
  const { items, itemsPorComensal, removeItem, updateCantidad, clearCart, subtotal } = useCart()
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
  const ivaMonto = ivaIncluido ? 0 : Math.round(subtotal * ivaPct * 100) / 10000
  const total = ivaIncluido ? subtotal : subtotal + ivaMonto

  async function handleConfirm() {
    if (items.length === 0) return
    setSubmitting(true); setError('')
    try {
      const body = {
        mesa_id: Number(mesaId),
        items: items.flatMap(i =>
          Array.from({ length: i.cantidad }, () => ({
            platillo_id: i.platilloId, cantidad: 1,
            precio_unitario: i.precioUnitario + i.modificadores.reduce((s, m) => s + m.precio, 0),
            notas: i.notas || undefined, modificador_ids: i.modificadores.map(m => m.id), usuario_id: i.usuarioId,
          }))
        ),
      }
      const pedido = await api<any>('/api/pedidos', { method: 'POST', body: JSON.stringify(body) })
      clearCart(); setSuccess(pedido.id)
    } catch (e: any) { setError(e.message || 'Error al crear pedido') } finally { setSubmitting(false) }
  }

  if (success) {
    if (!props?.onSuccess) return null
    setTimeout(() => props.onSuccess!(success), 1500)
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-2xl font-bold">Pedido enviado</p>
        <p className="text-sm text-muted-foreground">#{success}</p>
        <p className="text-xs text-muted-foreground/70 animate-pulse">redirigiendo...</p>
      </div>
    )
  }

  if (items.length === 0) return (
    <div className="text-center py-12 space-y-4">
      <p className="text-muted-foreground text-sm">No hay items en el carrito</p>
      <Button onClick={() => props?.onClose?.()}>Ver menú</Button>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {itemsPorComensal.map(grupo => (
          <div key={grupo.usuarioId} className="bg-white border border-border rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-background border-b border-border">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold shrink-0">
                {grupo.usuarioNombre[0]}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">{grupo.usuarioId === usuarioId && props?.usuarioNombre ? props.usuarioNombre : grupo.usuarioNombre}</span>
            </div>
            {grupo.items.map((item, i) => {
              const idx = items.findIndex(it =>
                it.platilloId === item.platilloId && it.usuarioId === item.usuarioId &&
                JSON.stringify(it.modificadores) === JSON.stringify(item.modificadores) && it.notas === item.notas
              )
              const itemTotal = (item.precioUnitario + item.modificadores.reduce((s, m) => s + m.precio, 0)) * item.cantidad
              return (
                <div key={i} className={`px-3 py-2.5 flex items-center gap-3 ${i > 0 ? 'border-t border-border' : ''}`}>
                  {grupo.usuarioId === usuarioId ? (
                    <div className="flex items-center border border-border rounded shrink-0">
                      <Button variant="ghost" size="icon-xs" className="rounded-none" onClick={() => updateCantidad(idx, -1)}>−</Button>
                      <span className="w-7 text-xs font-semibold text-center">{item.cantidad}</span>
                      <Button variant="ghost" size="icon-xs" className="rounded-none" onClick={() => updateCantidad(idx, 1)}>+</Button>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-muted-foreground w-[55px] text-center shrink-0">{item.cantidad}x</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.nombre}</p>
                    {(item.modificadores.length > 0 || item.notas) && (
                      <p className="text-muted-foreground/70 text-[11px] truncate">
                        {item.modificadores.map(m => m.nombre).join(', ')}{item.notas ? ` · ${item.notas}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold">${itemTotal.toFixed(2)}</span>
                    {grupo.usuarioId === usuarioId && (
                      <Button variant="ghost" size="icon-xs" className="text-muted-foreground/50 hover:text-red-400" onClick={() => removeItem(idx)}>✕</Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-3 space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">${subtotal.toFixed(2)}</span>
        </div>
        {!ivaIncluido && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">IVA ({ivaPct}%)</span>
            <span className="font-medium">${ivaMonto.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold border-t border-border pt-3">
          <span>Total{ivaIncluido ? <span className="text-[10px] text-muted-foreground/70 font-normal ml-1">(IVA incl.)</span> : ''}</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      {error && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>}

      <Button className="w-full h-12" onClick={handleConfirm} disabled={submitting}>
        {submitting ? 'Enviando…' : `Confirmar pedido — $${total.toFixed(2)}`}
      </Button>
    </div>
  )
}
