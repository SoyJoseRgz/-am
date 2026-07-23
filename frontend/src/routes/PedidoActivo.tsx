import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { User, Plus, Wallet, Banknote, Landmark, Percent } from 'lucide-react'
import { api, getCurrentUser } from '../services/api'
import { connectToMesa, socket } from '../services/socket'

interface ItemData {
  id: number; pedido_id: number; platillo_id: number; usuario_id: number
  cantidad: number; precio_unitario: string; estado: string; pagado: boolean
  notas: string | null; nombre: string; comensal_nombre: string
  modificadores: { id: number; nombre: string; precio: string }[]
}

interface PedidoData {
  id: number; mesa_id: number; usuario_id: number; estado: string
  created_at: string; comensal_nombre: string; items: ItemData[]
}

export default function PedidoActivo(props?: { restauranteId?: string; mesaId?: string; onSumarMas?: () => void; cuentaSolicitada?: boolean; onCuentaSolicitada?: () => void; onPagoCompletado?: () => void }) {
  const params = useParams()
  const restauranteId = props?.restauranteId || params.restauranteId
  const mesaId = props?.mesaId || params.mesaId
  const [pedidos, setPedidos] = useState<PedidoData[]>([])
  const [loading, setLoading] = useState(true)
  const [split, setSplit] = useState<'individual' | 'iguales' | 'yo_invito'>('individual')
  const [tip, setTip] = useState(0)
  const [tipCustom, setTipCustom] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [metodo, setMetodo] = useState<'efectivo' | 'deposito'>('efectivo')
  const [cambioPara, setCambioPara] = useState('')
  const [pagoEnviando, setPagoEnviando] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [depositoInfo, setDepositoInfo] = useState<{ banco: string; clabe: string; titular: string } | null>(null)
  const user = getCurrentUser()

  useEffect(() => {
    api<any>(`/api/restaurantes/${restauranteId}/menu`).then(d => setDepositoInfo(d.deposito_info || null)).catch(() => {})
  }, [restauranteId])

  function cargar() {
    if (!mesaId || !restauranteId) return
    setRefreshing(true)
    api<PedidoData[] | { error: string }>(`/api/pedidos/mesa/${mesaId}`)
      .then(data => { setPedidos(Array.isArray(data) ? data : []) }).catch(() => {}).finally(() => { setLoading(false); setTimeout(() => setRefreshing(false), 400) })
  }

  useEffect(() => {
    cargar()
    connectToMesa(Number(restauranteId), Number(mesaId))
    socket.on('item:actualizado', cargar)
    socket.on('pedido:creado', cargar)
    socket.on('item:pagado', cargar)
    return () => { socket.off('item:actualizado'); socket.off('pedido:creado'); socket.off('item:pagado') }
  }, [mesaId, restauranteId])

  const allItems = pedidos.flatMap(p => p.items)
  const activos = allItems.filter(i => i.estado !== 'cancelado')
  const cancelados = allItems.filter(i => i.estado === 'cancelado')

  const groups: Record<number, { nombre: string; items: ItemData[] }> = {}
  for (const item of activos) {
    const uid = item.usuario_id || 0
    if (!groups[uid]) groups[uid] = { nombre: item.comensal_nombre || 'Comensal', items: [] }
    groups[uid].items.push(item)
  }
  const personas = Object.values(groups)

  const userGroup = personas.find(p => p.items[0]?.usuario_id === user.id)
  const userItemsNoPagados = userGroup?.items.filter(i => !i.pagado) || []
  const userSubtotal = userItemsNoPagados.reduce((s, i) => s + Number(i.precio_unitario) * i.cantidad, 0)
  const todosPagados = personas.every(p => p.items.every(i => i.pagado))
  const total = activos.filter(i => !i.pagado).reduce((s, i) => s + Number(i.precio_unitario) * i.cantidad, 0)
  const tipPct = tip === -1 ? Number(tipCustom) || 0 : tip
  const tipAmount = total * tipPct / 100
  const granTotal = total + tipAmount
  const porPersonaTotal = personas.length > 0 ? granTotal / personas.length : 0
  const userDeuda = split === 'yo_invito' ? granTotal : split === 'iguales' ? porPersonaTotal : userSubtotal

  async function pagar() {
    setPagoEnviando(true)
    try {
      await api('/api/pedidos/pagar', {
        method: 'POST',
        body: JSON.stringify({ mesa_id: Number(mesaId), split, metodo_pago: metodo, cambio_para: cambioPara || null, tip: tipPct }),
      })
      setShowModal(false)
      cargar(); props?.onPagoCompletado?.()
    } catch {}
    setPagoEnviando(false)
  }

  if (loading) return <p className="text-center text-sm text-[#888] font-mono py-6">cargando..</p>

  const noHay = activos.length === 0 && cancelados.length === 0

  return (
    <div className="font-mono text-sm leading-relaxed space-y-4">
      {noHay ? (
        <div className="text-center py-10 space-y-4">
          <p className="text-[#888]">no hay pedidos activos</p>
          <button onClick={() => props?.onSumarMas?.()}
            className="text-[#111] underline underline-offset-2 decoration-dotted hover:no-underline">menu</button>
        </div>
      ) : (
        <>
          <div className="bg-white">
            <div className="text-center py-3 space-y-1">
              <p className={`text-xs text-[#999] tracking-[0.2em] transition-opacity ${refreshing ? 'opacity-40' : ''}`}>- - - pedido - - -</p>
            </div>

            <div className="divide-y divide-dashed divide-[#ddd]">
              {personas.map((p, gi) => (
                <div key={gi} className="py-3">
                  <p className="text-[11px] text-[#bbb] tracking-[0.15em] uppercase mb-2 flex items-center gap-1.5">
                    <User className="w-3 h-3" />
                    {p.nombre}
                    {p.items.every(i => i.pagado) ? <span className="text-[#aaa] ml-auto text-[10px] flex items-center gap-1">pagado</span> : ''}
                  </p>
                  <div className="space-y-0.5">
                    {p.items.map(item => {
                      const esPagado = item.pagado
                      const esEntregado = item.estado === 'entregado'
                      return (
                        <div key={item.id} className={`flex items-baseline justify-between gap-1 py-0.5 ${esPagado ? 'text-[#ddd]' : esEntregado ? 'text-[#bbb]' : 'text-[#111]'}`}>
                          <div className="flex items-baseline gap-1 min-w-0">
                            {esPagado && <span className="text-[10px] text-[#ccc] shrink-0">✓</span>}
                            <span className="font-medium shrink-0">{item.cantidad}</span>
                            <span className="truncate text-[11px]">{item.nombre}</span>
                          </div>
                          <span className="shrink-0 text-[11px]">${(Number(item.precio_unitario) * item.cantidad).toFixed(2)}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-baseline justify-between text-[11px] text-[#888] pt-1 mt-1 border-t border-dotted border-[#eee]">
                    <span>subtotal</span>
                    <span>${p.items.filter(i => !i.pagado).reduce((s, i) => s + Number(i.precio_unitario) * i.cantidad, 0).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            {!todosPagados && !userGroup?.items.every(i => i.pagado) && userItemsNoPagados.length > 0 && (
              <div className="border-t border-dashed border-[#ddd] pt-3 pb-1 space-y-2">
                <p className="text-[10px] text-[#999] tracking-[0.15em] uppercase text-center flex items-center justify-center gap-1">
                  <Wallet className="w-3 h-3" /> - - - pagar - - -
                </p>
                <div className="flex gap-1.5 justify-center">
                  {(['individual', 'iguales', 'yo_invito'] as const).map(s => (
                    <button key={s} onClick={() => { setSplit(s); setShowModal(true); setMetodo('efectivo'); setCambioPara('') }}
                      className={`text-[11px] px-3 py-1.5 border border-dashed transition ${
                        split === s ? 'border-[#111] text-[#111] font-medium' : 'border-[#ddd] text-[#bbb] hover:border-[#888]'
                      }`}>
                      {s === 'individual' ? 'cada quien' : s === 'iguales' ? 'iguales' : 'invito'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {cancelados.length > 0 && (
              <details className="border-t border-dashed border-[#ddd]">
                <summary className="py-2 text-[11px] text-[#bbb] cursor-pointer hover:text-[#888] tracking-wider uppercase text-center">
                  [{cancelados.length} cancelado{cancelados.length > 1 ? 's' : ''}]
                </summary>
                <div className="pb-2 space-y-1">
                  {cancelados.map(item => (
                    <p key={item.id} className="text-[11px] text-[#ddd] line-through">
                      {item.cantidad} {item.nombre}
                    </p>
                  ))}
                </div>
              </details>
            )}

            <div className="border-t border-dashed border-[#ddd] pt-3 pb-1 text-center">
              <button onClick={() => props?.onSumarMas?.()}
                className="text-[11px] text-[#888] underline underline-offset-2 decoration-dotted hover:text-[#111] uppercase tracking-wider flex items-center justify-center gap-1 mx-auto">
                <Plus className="w-3 h-3" /> pedir algo mas
              </button>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg">Pagar</h3>

            <div className="text-[11px] text-[#888] space-y-0.5">
              <p>{split === 'individual' ? `tus items — $${userSubtotal.toFixed(2)}` : split === 'iguales' ? `$${porPersonaTotal.toFixed(2)} c/u` : `tú pagas todo — $${granTotal.toFixed(2)}`}</p>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] text-[#888] tracking-wider uppercase flex items-center gap-1">
                <Wallet className="w-3 h-3" /> método de pago
              </p>
              <div className="flex gap-1.5">
                <button onClick={() => setMetodo('efectivo')}
                  className={`text-[11px] px-3 py-1.5 border border-dashed transition flex items-center gap-1 ${
                    metodo === 'efectivo' ? 'border-[#111] text-[#111] font-medium' : 'border-[#ddd] text-[#bbb] hover:border-[#888]'
                  }`}>
                  <Banknote className="w-3 h-3" /> efectivo
                </button>
                {depositoInfo && (
                  <button onClick={() => setMetodo('deposito')}
                    className={`text-[11px] px-3 py-1.5 border border-dashed transition flex items-center gap-1 ${
                      metodo === 'deposito' ? 'border-[#111] text-[#111] font-medium' : 'border-[#ddd] text-[#bbb] hover:border-[#888]'
                    }`}>
                    <Landmark className="w-3 h-3" /> depósito
                  </button>
                )}
              </div>
              {metodo === 'efectivo' && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-[#888] shrink-0">¿cambio de?</span>
                  <input type="number" min="0" placeholder="$"
                    value={cambioPara} onChange={e => setCambioPara(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-20 h-7 text-center text-[11px] border border-dashed border-[#ddd] outline-none focus:border-[#111] font-mono" />
                </div>
              )}
              {metodo === 'deposito' && depositoInfo && (
                <div className="bg-gray-50 border border-dashed border-[#ddd] rounded-md p-3 space-y-1.5 mt-1">
                  <p className="text-[11px] font-medium text-[#111] flex items-center gap-1">
                    <Landmark className="w-3 h-3" /> {depositoInfo.banco}
                  </p>
                  <p className="text-[11px] text-[#666] font-mono">{depositoInfo.clabe}</p>
                  <p className="text-[11px] text-[#888]">{depositoInfo.titular}</p>
                </div>
              )}
              {metodo === 'deposito' && !depositoInfo && (
                <p className="text-[11px] text-[#aaa]">pide los datos de depósito al mesero</p>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] text-[#888] tracking-wider uppercase flex items-center gap-1">
                <Percent className="w-3 h-3" /> propina
              </p>
              <div className="flex gap-1 flex-wrap">
                {[0, 10, 15, 20].map(t => (
                  <button key={t} onClick={() => setTip(t)}
                    className={`text-[11px] px-2 py-0.5 border border-dashed transition ${
                      tip === t ? 'border-[#111] text-[#111] font-medium' : 'border-[#ddd] text-[#bbb] hover:border-[#888]'
                    }`}>
                    {t}%
                  </button>
                ))}
                <button onClick={() => { setTip(-1); setTipCustom('') }}
                  className={`text-[11px] px-2 py-0.5 border border-dashed transition ${
                    tip === -1 ? 'border-[#111] text-[#111] font-medium' : 'border-[#ddd] text-[#bbb] hover:border-[#888]'
                  }`}>
                  otro
                </button>
              </div>
              {tip === -1 && (
                <div className="flex items-center gap-2">
                  <input type="number" min="0" max="100" placeholder="%"
                    value={tipCustom} onChange={e => setTipCustom(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    className="w-16 h-7 text-center text-[11px] border border-dashed border-[#ddd] outline-none focus:border-[#111] font-mono" />
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-[#ddd] pt-3 flex justify-between text-base font-bold">
              <span>total</span>
              <span>${granTotal.toFixed(2)}</span>
            </div>

            <button onClick={pagar} disabled={pagoEnviando}
              className="w-full py-3 text-sm font-medium text-white bg-[#111] hover:bg-[#000] transition disabled:opacity-40">
              {pagoEnviando ? 'enviando...' : `pagar $${userDeuda.toFixed(2)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
