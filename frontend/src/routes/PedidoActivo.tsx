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

const STATUS_TAG: Record<string, string> = {
  pendiente: 'PEND', preparando: 'PREP', listo: 'LISTO',
  entregado: 'ENTREG', cancelado: 'CANC',
}

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
      .then(data => { setPedidos(Array.isArray(data) ? data : []) }).catch(() => {}).finally(() => setLoading(false))
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

  if (loading) return <p className="text-center text-sm text-[#888] font-mono py-6">cargando..</p>

  const noHay = itemsDelDia.length === 0 && cancelados.length === 0

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
          {/* ticket */}
          <div className="bg-white">

            {/* header */}
            <div className="text-center py-3 space-y-1">
              <p className="text-xs text-[#999] tracking-[0.2em]">- - - pedido - - -</p>
            </div>

            {/* items */}
            <div className="divide-y divide-dashed divide-[#ddd]">
              {itemsDelDia.map(item => {
                const esEntregado = item.estado === 'entregado'
                return (
                  <div key={item.id} className={`py-2.5 ${esEntregado ? 'text-[#bbb]' : 'text-[#111]'}`}>
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="flex items-baseline gap-1.5 min-w-0">
                        <span className="font-medium shrink-0">{item.cantidad}</span>
                        <span className="truncate">{item.nombre}</span>
                      </div>
                      <span className={`shrink-0 ${esEntregado ? '' : 'font-medium'}`}>
                        ${(Number(item.precio_unitario) * item.cantidad).toFixed(2)}
                      </span>
                    </div>
                    {item.modificadores.length > 0 && (
                      <p className="text-[11px] text-[#aaa] mt-0.5 ml-5">{item.modificadores.map(m => m.nombre).join(', ')}</p>
                    )}
                    {item.notas && <p className="text-[11px] text-[#aaa] mt-0.5 ml-5">* {item.notas}</p>}
                    <div className="flex items-center gap-2 mt-1 ml-5">
                      <span className={`text-[10px] tracking-wider uppercase ${
                        item.estado === 'pendiente' ? 'text-[#111] font-bold' :
                        item.estado === 'preparando' ? 'text-[#555] font-medium' :
                        item.estado === 'listo' ? 'text-[#666]' :
                        'text-[#ccc]'
                      }`}>
                        [{STATUS_TAG[item.estado] || '—'}]
                      </span>
                      <span className="text-[10px] text-[#bbb]">{item.comensal_nombre}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* cancelados */}
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

            {/* agregar */}
            <div className="border-t border-dashed border-[#ddd] pt-3 pb-1 text-center">
              <button onClick={() => props?.onSumarMas?.()}
                className="text-[11px] text-[#888] underline underline-offset-2 decoration-dotted hover:text-[#111] uppercase tracking-wider">
                + agregar mas
              </button>
            </div>
          </div>

          {/* cuenta */}
          <div className="bg-white py-3 space-y-2">
            <div className="text-center text-[10px] text-[#999] tracking-[0.2em]">- - - cuenta - - -</div>

            {personas.map((p, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-[#666]">{p.nombre}</span>
                <span>${p.subtotal.toFixed(2)}</span>
              </div>
            ))}

            <div className="border-t border-dashed border-[#ddd] pt-2 mt-2 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-[#888]">subtotal</span>
                <span>${total.toFixed(2)}</span>
              </div>
              {!ivaIncluido && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#888]">iva ({ivaPct}%)</span>
                  <span>${iva.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* propina */}
            <div className="flex items-center justify-between gap-2 py-1">
              <span className="text-[11px] text-[#888]">propina:</span>
              <div className="flex gap-1">
                {[0, 10, 15, 20].map(t => (
                  <button key={t} onClick={() => setTip(t)}
                    className={`text-[11px] px-2 py-0.5 border border-dashed transition ${
                      tip === t ? 'border-[#111] text-[#111] font-medium' : 'border-[#ddd] text-[#bbb] hover:border-[#888]'
                    }`}>
                    {t}%
                  </button>
                ))}
              </div>
            </div>

            {/* split */}
            {personas.length > 1 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-[#888]">split:</span>
                  {(['individual', 'iguales', 'yo_invito'] as const).map(s => (
                    <button key={s} onClick={() => setSplit(s)}
                      className={`text-[11px] px-2 py-0.5 border border-dashed transition ${
                        split === s ? 'border-[#111] text-[#111] font-medium' : 'border-[#ddd] text-[#bbb] hover:border-[#888]'
                      }`}>
                      {s === 'individual' ? 'c/u' : s === 'iguales' ? 'iguales' : 'invito'}
                    </button>
                  ))}
                </div>
                {split === 'individual' && (
                  <div className="text-[11px] text-[#888] space-y-0.5">
                    {personas.map((p, i) => {
                      const ivaShare = (p.subtotal / total) * iva
                      const tipShare = (p.subtotal / total) * tipAmount
                      return <div key={i} className="flex justify-between"><span>{p.nombre}</span><span>${(p.subtotal + ivaShare + tipShare).toFixed(2)}</span></div>
                    })}
                  </div>
                )}
                {split === 'iguales' && (
                  <div className="flex justify-between text-[11px] text-[#888]">
                    <span>cada quien</span>
                    <span className="font-medium text-[#111]">${porPersona.toFixed(2)}</span>
                  </div>
                )}
                {split === 'yo_invito' && (
                  <div className="space-y-1">
                    <div className="flex gap-1 flex-wrap">
                      {personas.map((p, i) => (
                        <button key={i} onClick={() => setYoInvitaIdx(i)}
                          className={`text-[11px] px-2 py-0.5 border border-dashed transition ${
                            yoInvitaIdx === i ? 'border-[#111] text-[#111] font-medium' : 'border-[#ddd] text-[#bbb] hover:border-[#888]'
                          }`}>
                          {p.nombre}
                        </button>
                      ))}
                    </div>
                    <div className="text-[11px] text-[#888] space-y-0.5">
                      {personas.map((p, i) => (
                        <div key={i} className="flex justify-between">
                          <span>{p.nombre}</span>
                          <span className={i === yoInvitaIdx ? 'font-medium text-[#111]' : ''}>
                            {i === yoInvitaIdx ? `$${granTotal.toFixed(2)}` : '$0.00'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-dashed border-[#ddd] pt-3 mt-2 flex justify-between text-base font-bold">
              <span>total</span>
              <span>${granTotal.toFixed(2)}</span>
            </div>

            <button onClick={pedirCuenta} disabled={cuentaEnviando || cuentaEnviada || personas.length === 0}
              className={`w-full py-3 text-sm font-medium mt-3 transition ${
                cuentaEnviada
                  ? 'text-[#999]'
                  : 'text-[#111] bg-white border-2 border-[#111] hover:bg-[#111] hover:text-white'
              }`}>
              {cuentaEnviada ? '[ SOLICITADA ]' : `pedir cuenta — $${granTotal.toFixed(2)}`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
