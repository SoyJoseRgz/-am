import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../services/api'
import { connectToMesa, socket } from '../services/socket'

interface ItemData {
  id: number; pedido_id: number; platillo_id: number; usuario_id: number
  cantidad: number; precio_unitario: string; estado: string
  notas: string | null; nombre: string; comensal_nombre: string
  modificadores: { id: number; nombre: string; precio: string }[]
}

interface PedidoData {
  id: number; mesa_id: number; usuario_id: number; estado: string
  created_at: string; comensal_nombre: string; items: ItemData[]
}

const ESTADO_ICO: Record<string, string> = { pendiente: '🟡', preparando: '🔵', listo: '🟢', entregado: '⚫', cancelado: '🔴' }

export default function PedidoActivo(props?: { restauranteId?: string; mesaId?: string; onClose?: () => void; onSumarMas?: () => void }) {
  const params = useParams()
  const restauranteId = props?.restauranteId || params.restauranteId
  const mesaId = props?.mesaId || params.mesaId
  const [pedidos, setPedidos] = useState<PedidoData[]>([])
  const [loading, setLoading] = useState(true)
  const [cuentaEnviando, setCuentaEnviando] = useState(false)
  const [cuentaEnviada, setCuentaEnviada] = useState(false)
  const [ivaPct, setIvaPct] = useState(16)
  const [ivaIncluido, setIvaIncluido] = useState(true)
  const [split, setSplit] = useState<'individual' | 'iguales' | 'yo_invito'>('individual')
  const [yoInvitaIdx, setYoInvitaIdx] = useState(0)
  const [tip, setTip] = useState(0)

  function cargar() {
    if (!mesaId || !restauranteId) return
    api<PedidoData[] | { error: string }>(`/api/pedidos/mesa/${mesaId}`)
      .then(data => { setPedidos(Array.isArray(data) ? data : []) })
      .catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => {
    cargar()
    connectToMesa(Number(restauranteId), Number(mesaId))
    socket.on('item:actualizado', cargar)
    socket.on('pedido:creado', cargar)
    return () => { socket.off('item:actualizado'); socket.off('pedido:creado') }
  }, [mesaId, restauranteId])

  useEffect(() => {
    api<{ iva_porcentaje: number; iva_incluido: boolean }>(`/api/restaurantes/${restauranteId}/menu`)
      .then(d => { setIvaPct(d.iva_porcentaje); setIvaIncluido(d.iva_incluido) }).catch(() => {})
  }, [restauranteId])

  const itemsDelDia = pedidos.flatMap(p => p.items).filter(i => i.estado !== 'cancelado')
  const cancelados = pedidos.flatMap(p => p.items).filter(i => i.estado === 'cancelado')

  const groups: Record<number, { nombre: string; items: ItemData[]; subtotal: number }> = {}
  for (const item of itemsDelDia) {
    const uid = item.usuario_id || 0
    if (!groups[uid]) groups[uid] = { nombre: item.comensal_nombre || 'Comensal', items: [], subtotal: 0 }
    groups[uid].items.push(item)
    groups[uid].subtotal += Number(item.precio_unitario) * item.cantidad
  }
  const personas = Object.values(groups)
  const total = personas.reduce((s, p) => s + p.subtotal, 0)
  const iva = ivaIncluido ? total - total / (1 + ivaPct / 100) : total * ivaPct / 100
  const totalConIva = ivaIncluido ? total : total + iva
  const tipAmount = totalConIva * tip / 100
  const granTotal = totalConIva + tipAmount
  const porPersona = split === 'iguales' && personas.length > 0 ? granTotal / personas.length : 0

  async function pedirCuenta() {
    setCuentaEnviando(true)
    try {
      await api(`/api/llamados/mesa/${mesaId}`, {
        method: 'POST', body: JSON.stringify({ tipo: 'cuenta', restaurante_id: Number(restauranteId), split, tip }),
      })
      setCuentaEnviada(true)
    } catch {}
    setCuentaEnviando(false)
  }

  if (loading) return <p className="text-[#888] text-sm text-center py-6">Cargando...</p>

  return (
    <div className="space-y-4">
      {itemsDelDia.length === 0 && cancelados.length === 0 ? (
        <div className="text-center py-10 space-y-4">
          <p className="text-[#888] text-sm">No hay pedidos activos</p>
          <button onClick={() => props?.onSumarMas?.()} className="bg-[#111] text-white px-6 py-2 rounded-md text-sm">Ver menú</button>
        </div>
      ) : (
        <>
          {/* ticket items */}
          <div className="bg-white border border-[#e5ddd2] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-dashed border-[#e5ddd2] text-center">
              <p className="text-[10px] text-[#888] uppercase tracking-widest">— Pedido —</p>
            </div>
            <div className="divide-y divide-dashed divide-[#e5ddd2]">
              {itemsDelDia.map(item => (
                <div key={item.id} className="px-4 py-2.5 flex items-start gap-3">
                  <span className="shrink-0 text-xs leading-5">{ESTADO_ICO[item.estado] || '⚪'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium truncate">
                        {item.cantidad > 1 && <span className="text-[#888]">{item.cantidad}x </span>}
                        {item.nombre}
                      </p>
                      <span className="text-sm font-semibold shrink-0">${(Number(item.precio_unitario) * item.cantidad).toFixed(2)}</span>
                    </div>
                    {item.modificadores.length > 0 && (
                      <p className="text-[11px] text-[#aaa]">{item.modificadores.map(m => m.nombre).join(', ')}</p>
                    )}
                    {item.notas && <p className="text-[11px] text-[#aaa] italic">📝 {item.notas}</p>}
                    <p className="text-[10px] text-[#bbb] mt-0.5">{item.comensal_nombre}</p>
                  </div>
                </div>
              ))}
            </div>
            {cancelados.length > 0 && (
              <details className="border-t border-dashed border-[#e5ddd2]">
                <summary className="px-4 py-2 text-xs text-[#bbb] cursor-pointer hover:text-[#888] transition-colors">
                  Cancelados ({cancelados.length})
                </summary>
                <div className="px-4 pb-2 space-y-1">
                  {cancelados.map(item => (
                    <p key={item.id} className="text-[11px] text-[#ccc] line-through">
                      {item.cantidad}x {item.nombre}
                    </p>
                  ))}
                </div>
              </details>
            )}
          </div>

          {/* sumar + */}
          <button onClick={() => props?.onSumarMas?.()}
            className="w-full h-10 text-sm border border-dashed border-[#e5ddd2] text-[#888] hover:text-[#111] hover:border-[#888] rounded-md transition flex items-center justify-center gap-1">
            + Agregar más
          </button>

          {/* totes y cuenta */}
          <div className="bg-white border border-[#e5ddd2] rounded-lg p-4 space-y-2 text-sm">
            {personas.map((p, i) => (
              <div key={i} className="flex justify-between text-[#888]">
                <span>{p.nombre}</span>
                <span>${p.subtotal.toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-dashed border-[#e5ddd2] pt-2 mt-2 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#888]">Subtotal</span>
                <span className="font-medium">${total.toFixed(2)}</span>
              </div>
              {!ivaIncluido && (
                <div className="flex justify-between">
                  <span className="text-[#888]">IVA ({ivaPct}%)</span>
                  <span className="font-medium">${iva.toFixed(2)}</span>
                </div>
              )}
              {/* propina */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1">
                  <span className="text-[#888] text-xs">Propina:</span>
                  {[0, 10, 15, 20].map(t => (
                    <button key={t} onClick={() => setTip(t)}
                      className={`text-xs px-2 py-0.5 rounded border ${tip === t ? 'bg-[#111] text-white border-[#111]' : 'border-[#e5ddd2] text-[#888] hover:border-[#888]'} transition`}>
                      {t}%
                    </button>
                  ))}
                </div>
                {tip > 0 && <span className="font-medium text-xs">+${tipAmount.toFixed(2)}</span>}
              </div>
              {/* split */}
              {personas.length > 1 && (
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[#888] text-xs">Dividir:</span>
                  {(['individual', 'iguales', 'yo_invito'] as const).map(s => (
                    <button key={s} onClick={() => setSplit(s)}
                      className={`text-xs px-2 py-0.5 rounded border ${split === s ? 'bg-[#111] text-white border-[#111]' : 'border-[#e5ddd2] text-[#888] hover:border-[#888]'} transition`}>
                      {s === 'individual' ? 'Individual' : s === 'iguales' ? 'Iguales' : 'Yo invito'}
                    </button>
                  ))}
                </div>
              )}
              {split === 'individual' && (
                <div className="text-xs text-[#888] space-y-0.5">
                  {personas.map((p, i) => {
                    const ivaShare = (p.subtotal / total) * iva
                    const tipShare = (p.subtotal / total) * tipAmount
                    return <div key={i} className="flex justify-between"><span>{p.nombre}</span><span>${(p.subtotal + ivaShare + tipShare).toFixed(2)}</span></div>
                  })}
                </div>
              )}
              {split === 'iguales' && <div className="flex justify-between text-xs text-[#888]"><span>Cada quien</span><span className="font-semibold">${porPersona.toFixed(2)}</span></div>}
              {split === 'yo_invito' && (
                <div className="space-y-1">
                  <div className="flex gap-1 flex-wrap">
                    {personas.map((p, i) => (
                      <button key={i} onClick={() => setYoInvitaIdx(i)}
                        className={`text-xs px-2 py-0.5 rounded border ${yoInvitaIdx === i ? 'bg-[#111] text-white border-[#111]' : 'border-[#e5ddd2] text-[#888]'} transition`}>
                        {p.nombre}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-[#888] space-y-0.5">
                    {personas.map((p, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{p.nombre}</span>
                        <span className={i === yoInvitaIdx ? 'font-semibold' : ''}>{i === yoInvitaIdx ? `$${granTotal.toFixed(2)}` : '$0.00'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t border-[#e5ddd2] pt-3">
                <span>Total</span>
                <span>${granTotal.toFixed(2)}</span>
              </div>
            </div>

            <button onClick={pedirCuenta} disabled={cuentaEnviando || cuentaEnviada || personas.length === 0}
              className={`w-full h-11 text-sm rounded-md font-semibold transition mt-3 ${
                cuentaEnviada ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-[#111] hover:bg-[#000] text-white'
              }`}>
              {cuentaEnviada ? '✓ Cuenta solicitada' : `Pedir cuenta — $${granTotal.toFixed(2)}`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
