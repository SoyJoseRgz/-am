import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { User, Plus, Wallet, Banknote, Landmark, Percent, Copy, Check, X } from 'lucide-react'
import { api, getCurrentUser } from '../services/api'
import { connectToMesa, socket } from '../services/socket'

function DepositoField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-[#888] uppercase tracking-wider shrink-0 w-12">{label}</span>
      <span className="text-[11px] text-[#111] font-mono tracking-wider break-all">{value}</span>
      <button onClick={async () => { try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {} }}
        className="shrink-0 ml-auto text-[#bbb] hover:text-[#111] transition-colors">
        {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  )
}

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

export default function PedidoActivo(props?: { restauranteId?: string; mesaId?: string; onSumarMas?: () => void; cuentaSolicitada?: boolean; onCuentaSolicitada?: () => void; onPagoSolicitado?: (data: { metodo_pago: string }) => void }) {
  const params = useParams()
  const restauranteId = props?.restauranteId || params.restauranteId
  const mesaId = props?.mesaId || params.mesaId
  const [pedidos, setPedidos] = useState<PedidoData[]>([])
  const [loading, setLoading] = useState(true)
  const [split, setSplit] = useState<'individual' | 'iguales' | 'yo_invito'>('individual')
  const [tip, setTip] = useState(0)
  const [tipCustom, setTipCustom] = useState('')
  const [tipMode, setTipMode] = useState<'pct' | 'amount'>('pct')
  const [tipFijo, setTipFijo] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [metodo, setMetodo] = useState<'efectivo' | 'deposito'>('efectivo')
  const [cambioPara, setCambioPara] = useState('')
  const [pagoEnviando, setPagoEnviando] = useState(false)
  const [pagoError, setPagoError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [depositoInfo, setDepositoInfo] = useState<{ banco: string; clabe: string; numero_tarjeta?: string; titular: string } | null>(null)
  const [ivaPct, setIvaPct] = useState(16)
  const [ivaIncluido, setIvaIncluido] = useState(true)
  const [cancelandoItem, setCancelandoItem] = useState<number | null>(null)
  const [cancelError, setCancelError] = useState('')
  const user = getCurrentUser()

  useEffect(() => {
    api<any>(`/api/restaurantes/${restauranteId}/menu`).then(d => {
      setDepositoInfo(d.deposito_info || null)
      if (d.iva_porcentaje != null) setIvaPct(d.iva_porcentaje)
      if (d.iva_incluido != null) setIvaIncluido(d.iva_incluido)
    }).catch(() => {})
  }, [restauranteId])

  function cargar() {
    if (!mesaId || !restauranteId) return
    setRefreshing(true)
    api<PedidoData[] | { error: string }>(`/api/pedidos/mesa/${mesaId}`)
      .then(data => { setPedidos(Array.isArray(data) ? data : []) }).catch(() => setPagoError('Error al actualizar')).finally(() => { setLoading(false); setTimeout(() => setRefreshing(false), 400) })
  }

  useEffect(() => {
    cargar()
    connectToMesa(Number(restauranteId), Number(mesaId))
    socket.on('item:actualizado', cargar)
    socket.on('pedido:creado', cargar)
    socket.on('item:pagado', cargar)
    return () => { socket.off('item:actualizado', cargar); socket.off('pedido:creado', cargar); socket.off('item:pagado', cargar) }
  }, [mesaId, restauranteId])

  const allItems = pedidos.flatMap(p => p.items)
  const cancelados = allItems.filter(i => i.estado === 'cancelado')

  const groups: Record<number, { nombre: string; preparando: ItemData[]; entregados: ItemData[] }> = {}
  for (const item of allItems) {
    if (item.estado === 'cancelado') continue
    const uid = item.usuario_id || 0
    if (!groups[uid]) groups[uid] = { nombre: item.comensal_nombre || 'Comensal', preparando: [], entregados: [] }
    if (item.estado === 'entregado') groups[uid].entregados.push(item)
    else groups[uid].preparando.push(item)
  }
  const personas = Object.values(groups)

  const esGrupo = personas.length > 1
  const userGroup = personas.find(p => [...p.entregados, ...p.preparando].some(i => i.usuario_id === user.id))
  const userItemsNoPagados = userGroup?.entregados.filter(i => !i.pagado) || []
  const userSubtotal = userItemsNoPagados.reduce((s, i) => s + Number(i.precio_unitario) * i.cantidad, 0)
  const todosPagados = personas.every(p => p.entregados.every(i => i.pagado))
  const total = personas.flatMap(p => p.entregados).filter(i => !i.pagado).reduce((s, i) => s + Number(i.precio_unitario) * i.cantidad, 0)
  const tipPct = tip === -1 ? Number(tipCustom) || 0 : tip
  const tipMonto = tipMode === 'amount' ? (Number(tipFijo) || 0) : total * tipPct / 100
  const ivaMonto = ivaIncluido ? 0 : total * ivaPct / 100
  const granTotal = total + ivaMonto + tipMonto
  const porPersonaTotal = personas.length > 0 ? granTotal / personas.length : 0
  const userDeuda = split === 'yo_invito' ? granTotal
    : split === 'iguales' ? porPersonaTotal
    : total > 0 ? userSubtotal + (userSubtotal / total) * (ivaMonto + tipMonto)
    : userSubtotal

  async function pagar() {
    setPagoEnviando(true); setPagoError('')
    try {
      const res = await api<{ success: boolean; metodo_pago: string }>('/api/pedidos/solicitar-pago', {
        method: 'POST',
        body: JSON.stringify({ mesa_id: Number(mesaId), split, metodo_pago: metodo, cambio_para: cambioPara || null, tip: tipMode === 'amount' ? 0 : tipPct, tip_monto: tipMode === 'amount' ? tipMonto : 0 }),
      })
      setShowModal(false); setPagoError('')
      cargar()
      props?.onPagoSolicitado?.({ metodo_pago: res.metodo_pago || metodo })
    } catch (e: any) { setPagoError(e?.message || 'Error al procesar el pago') }
    setPagoEnviando(false)
  }

  async function cancelarItem(item: ItemData) {
    setCancelandoItem(item.id); setCancelError('')
    try {
      await api(`/api/pedidos/${item.pedido_id}/items/${item.id}/cancelar`, { method: 'PUT' })
      setCancelandoItem(null)
      cargar()
    } catch (e: any) {
      setCancelError(e?.message || 'Error al cancelar')
      setCancelandoItem(null)
    }
  }

  if (loading) return <div className="py-6" />

  const noHay = personas.length === 0 && cancelados.length === 0

  return (
    <div className="text-sm leading-relaxed space-y-4">
      {noHay ? (
        <div className="text-center py-10 space-y-4">
          <p className="text-[#888]">no hay pedidos activos</p>
          <button onClick={() => props?.onSumarMas?.()}
            className="text-[#111] underline underline-offset-2 decoration-dotted hover:no-underline">menú</button>
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
                    {p.entregados.length > 0 && p.entregados.every(i => i.pagado) && p.preparando.length === 0
                      ? <span className="text-[#aaa] ml-auto text-[10px] flex items-center gap-1">pagado</span>
                      : ''}
                  </p>

                  {p.preparando.length > 0 && (
                    <div className="mb-2">
                      <p className="text-[10px] text-[#ccc] tracking-wider uppercase mb-1">en preparación</p>
                      <div className="space-y-0.5">
                        {p.preparando.map(item => {
                          const esPendiente = item.estado === 'pendiente'
                          const esMio = item.usuario_id === user.id
                          return (
                          <div key={item.id} className="flex items-baseline justify-between gap-1 py-0.5 text-[#999]">
                            <div className="flex items-baseline gap-1 min-w-0">
                              <span className="font-medium shrink-0">{item.cantidad}</span>
                              <span className="truncate text-[11px] italic">{item.nombre}</span>
                            </div>
                            {esPendiente && esMio && (
                              <button onClick={() => cancelarItem(item)} disabled={cancelandoItem === item.id}
                                className="shrink-0 w-5 h-5 flex items-center justify-center text-[10px] text-red-300 hover:text-red-500 border border-red-100 hover:border-red-300 rounded-full transition">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )})}
                      </div>
                    </div>
                  )}

                  {p.entregados.length > 0 && (
                    <>
                      {p.preparando.length > 0 && <div className="border-t border-dotted border-[#eee] mb-2" />}
                      <div className="space-y-0.5">
                        {p.entregados.map(item => {
                          const esPagado = item.pagado
                          return (
                            <div key={item.id} className={`flex items-baseline justify-between gap-1 py-0.5 ${esPagado ? 'text-[#ddd]' : 'text-[#111]'}`}>
                              <div className="flex items-baseline gap-1 min-w-0">
                                {esPagado && <span className="text-[10px] text-[#ccc] shrink-0">✓</span>}
                                <span className="font-medium shrink-0">{item.cantidad}</span>
                                <span className="truncate text-[11px]">{item.nombre}</span>
                              </div>
                              {!esPagado && <span className="shrink-0 text-[11px]">${(Number(item.precio_unitario) * item.cantidad).toFixed(2)}</span>}
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex items-baseline justify-between text-[11px] text-[#888] pt-1 mt-1 border-t border-dotted border-[#eee]">
                        <span>subtotal</span>
                        <span>${p.entregados.filter(i => !i.pagado).reduce((s, i) => s + Number(i.precio_unitario) * i.cantidad, 0).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {!todosPagados && userItemsNoPagados.length > 0 && (
              <div className="border-t border-dashed border-[#ddd] pt-3 pb-1 space-y-2">
                <p className="text-[10px] text-[#999] tracking-[0.15em] uppercase text-center flex items-center justify-center gap-1">
                  <Wallet className="w-3 h-3" /> - - - pagar - - -
                </p>
                {esGrupo ? (
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
                ) : (
                  <div className="flex justify-center">
                    <button onClick={() => { setShowModal(true); setMetodo('efectivo'); setCambioPara('') }}
                      className="text-[11px] px-4 py-1.5 border border-dashed border-[#111] text-[#111] font-medium hover:bg-gray-50 transition">
                      Pagar — ${(userSubtotal + (ivaIncluido ? 0 : userSubtotal * ivaPct / 100)).toFixed(2)}
                    </button>
                  </div>
                )}
              </div>
            )}

            {cancelError && (
              <p className="text-[11px] text-red-500 text-center bg-red-50 border border-red-100 rounded-md px-3 py-2">{cancelError}</p>
            )}
            {cancelados.length > 0 && (
              <details className="border-t border-dashed border-[#ddd]">
                <summary className="py-2 text-[11px] text-[#bbb] cursor-pointer hover:text-[#888] tracking-wider uppercase text-center">
                  [{cancelados.length} cancelado{cancelados.length > 1 ? 's' : ''}]
                </summary>
                <div className="pb-2 space-y-1">
                  {cancelados.map(item => (
                    <p key={item.id} className="text-[11px] text-[#bbb] line-through">
                      {item.cantidad} {item.nombre}
                    </p>
                  ))}
                </div>
              </details>
            )}

            <div className="border-t border-dashed border-[#ddd] pt-3 pb-1 text-center">
              <button onClick={() => props?.onSumarMas?.()}
                className="text-[11px] text-[#888] underline underline-offset-2 decoration-dotted hover:text-[#111] uppercase tracking-wider flex items-center justify-center gap-1 mx-auto">
                <Plus className="w-3 h-3" /> pedir algo más
              </button>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg">Pagar</h3>

            {/* items del usuario */}
            {userItemsNoPagados.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] text-[#999] tracking-[0.15em] uppercase flex items-center gap-1">
                  <User className="w-3 h-3" /> tu cuenta
                </p>
                <div className="divide-y divide-dashed divide-[#eee]">
                  {userItemsNoPagados.map(item => (
                    <div key={item.id} className="flex justify-between py-0.5 text-[11px]">
                      <span className="text-[#111]">{item.cantidad} {item.nombre}</span>
                      <span className="text-[#888]">${(Number(item.precio_unitario) * item.cantidad).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[11px] font-medium pt-1 border-t border-dashed border-[#ddd]">
                  <span>subtotal</span>
                  <span>${userSubtotal.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* grupo: total mesa */}
            {esGrupo && (
              <div className="space-y-1">
                <p className="text-[10px] text-[#999] tracking-[0.15em] uppercase">total mesa</p>
                <div className="flex justify-between text-[11px] text-[#888]">
                  <span>subtotal mesa</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-[#888]">
                  <span>IVA ({ivaPct}%){ivaIncluido ? ' incl.' : ''}</span>
                  <span>${ivaMonto.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-[#888]">
                  <span>propina {tipMode === 'amount' ? '' : `(${tipPct}%)`}</span>
                  <span>${tipMonto.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] font-medium pt-1 border-t border-dashed border-[#ddd]">
                  <span>total mesa</span>
                  <span>${granTotal.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* grupo: tu parte */}
            {esGrupo && (
              <div className="bg-gray-50 border border-dashed border-[#ddd] rounded-md p-3 text-center">
                <p className="text-[10px] text-[#888] tracking-[0.15em] uppercase mb-1">
                  {split === 'individual' ? 'tu parte (individual)' : split === 'iguales' ? 'tu parte (iguales)' : 'invitas tú'}
                </p>
                <p className="text-lg font-bold">${userDeuda.toFixed(2)}</p>
                {split === 'iguales' && (
                  <p className="text-[10px] text-[#aaa] mt-0.5">{personas.length} personas</p>
                )}
              </div>
            )}

            {/* solo: total */}
            {!esGrupo && (
              <div className="border-t border-dashed border-[#ddd] pt-3 flex justify-between text-base font-bold">
                <span>total</span>
                <span>${(userSubtotal + (ivaIncluido ? 0 : userSubtotal * ivaPct / 100) + tipMonto).toFixed(2)}</span>
              </div>
            )}

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
                <div className="bg-gray-50 border border-dashed border-[#ddd] rounded-md p-3 space-y-2.5 mt-1">
                  <div className="flex items-center gap-1 text-[11px] font-medium text-[#111]">
                    <Landmark className="w-3 h-3" /> {depositoInfo.banco}
                  </div>
                  <DepositoField label="CLABE" value={depositoInfo.clabe} />
                  {depositoInfo.numero_tarjeta && <DepositoField label="Tarjeta" value={depositoInfo.numero_tarjeta} />}
                  <div className="text-[11px] text-[#888]">{depositoInfo.titular}</div>
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
                  <button key={t} onClick={() => { setTip(t); setTipMode('pct'); setTipFijo('') }}
                    className={`text-[11px] px-2 py-0.5 border border-dashed transition ${
                      tip === t && tipMode === 'pct' ? 'border-[#111] text-[#111] font-medium' : 'border-[#ddd] text-[#bbb] hover:border-[#888]'
                    }`}>
                    {t}%
                  </button>
                ))}
                <button onClick={() => { setTip(-1); setTipCustom(''); setTipMode('pct'); setTipFijo('') }}
                  className={`text-[11px] px-2 py-0.5 border border-dashed transition ${
                    tip === -1 && tipMode === 'pct' ? 'border-[#111] text-[#111] font-medium' : 'border-[#ddd] text-[#bbb] hover:border-[#888]'
                  }`}>
                  otro
                </button>
                <button onClick={() => { setTip(-2); setTipMode('amount'); setTipCustom('') }}
                  className={`text-[11px] px-2 py-0.5 border border-dashed transition ${
                    tipMode === 'amount' ? 'border-[#111] text-[#111] font-medium' : 'border-[#ddd] text-[#bbb] hover:border-[#888]'
                  }`}>
                  fijo
                </button>
              </div>
              {tip === -1 && tipMode === 'pct' && (
                <div className="flex items-center gap-2">
                  <input type="number" min="0" max="100" placeholder="%"
                    value={tipCustom} onChange={e => setTipCustom(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    className="w-16 h-7 text-center text-[11px] border border-dashed border-[#ddd] outline-none focus:border-[#111] font-mono" />
                </div>
              )}
              {tipMode === 'amount' && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#888]">$</span>
                  <input type="number" min="0" placeholder="0"
                    value={tipFijo} onChange={e => setTipFijo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-20 h-7 text-center text-[11px] border border-dashed border-[#ddd] outline-none focus:border-[#111] font-mono" />
                </div>
              )}
            </div>

            {pagoError && (
              <p className="text-[11px] text-red-500 text-center bg-red-50 border border-red-100 rounded-md px-3 py-2">{pagoError}</p>
            )}
            <button onClick={pagar} disabled={pagoEnviando}
              className="w-full py-3 text-sm font-medium text-white bg-[#111] hover:bg-[#000] transition disabled:opacity-40">
              {pagoEnviando ? 'enviando...' : `solicitar pago $${userDeuda.toFixed(2)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
