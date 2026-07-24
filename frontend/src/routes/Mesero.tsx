import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { api, getCurrentUser, clearAppData } from '../services/api'
import { connectToRestaurante, socket } from '../services/socket'
import { MESA_ESTADO_LABEL } from '../constants/estados'
import { CartProvider } from '../stores/CartContext'
import MenuDigital from './MenuDigital'
import PrePedido from './PrePedido'
import PedidoActivo from './PedidoActivo'
import MeseroKanban from './MeseroKanban'

interface MesaInfo {
  id: number; numero: number; estado: string; comensales: number; pedidos_activos: number
}

interface PagoPendiente {
  id: number; mesa_id: number; mesa_numero: number; usuario_id: number
  metodo_pago: string; monto_total: number; usuario_nombre?: string
  split_type: string; tip_pct: number; tip_monto: number; cambio_para: string | null
}

interface Llamado {
  id: number; mesa_id: number; mesa_numero: number; tipo: string; mensaje: string | null
  usuario_nombre: string; created_at: string
  split_preference: string | null; tip_preference: number | null
}

const ESTADO_ACCENT: Record<string, string> = {
  libre: 'border-l-green-400', ocupada: 'border-l-red-400', unida: 'border-l-yellow-400',
  pagada: 'border-l-blue-400', limpiando: 'border-l-amber-400',
}
const ESTADO_DOT: Record<string, string> = {
  libre: 'bg-green-400', ocupada: 'bg-red-400', unida: 'bg-yellow-400',
  pagada: 'bg-blue-400', limpiando: 'bg-amber-400',
}
const ESTADO_BADGE: Record<string, string> = {
  libre: 'bg-green-100 text-green-800 border-green-300', ocupada: 'bg-red-100 text-red-800 border-red-300',
  unida: 'bg-yellow-100 text-yellow-800 border-yellow-300', pagada: 'bg-blue-100 text-blue-800 border-blue-300',
  limpiando: 'bg-amber-100 text-amber-800 border-amber-300',
}

interface CuentaItem {
  id: number; platillo_id: number; usuario_id: number | null; cantidad: number
  precio_unitario: string; estado: string; pagado: boolean; notas: string | null
  nombre: string; comensal_nombre: string | null
}

interface CuentaData {
  items: CuentaItem[]; iva_porcentaje: number; iva_incluido: boolean; mesa_id: number
}

export default function Mesero() {
  const navigate = useNavigate()
  const [mesas, setMesas] = useState<MesaInfo[]>([])
  const [llamados, setLlamados] = useState<Llamado[]>([])
  const [pagosPendientes, setPagosPendientes] = useState<PagoPendiente[]>([])
  const [sel, setSel] = useState<MesaInfo | null>(null)
  const [unirId, setUnirId] = useState('')
  const [tomarPedido, setTomarPedido] = useState<MesaInfo | null>(null)
  const [verPedido, setVerPedido] = useState<MesaInfo | null>(null)
  const [cuenta, setCuenta] = useState<CuentaData | null>(null)
  const [cuentaMesa, setCuentaMesa] = useState<{ id: number; numero: number } | null>(null)
  const [split, setSplit] = useState<'individual' | 'iguales' | 'yo_invito'>('individual')
  const [yoInvitaIdx, setYoInvitaIdx] = useState(0)
  const [tip, setTip] = useState(0)
  const [showPre, setShowPre] = useState(false)
  const [showPA, setShowPA] = useState(false)
  const [kanban, setKanban] = useState(false)
  const user = getCurrentUser()

  useEffect(() => {
    if (!user.restaurante_id) return
    api<MesaInfo[]>('/api/mesero/mesas').then(setMesas).catch(() => {})
    api<Llamado[]>('/api/llamados/restaurante/' + user.restaurante_id).then(setLlamados).catch(() => {})
    api<PagoPendiente[]>('/api/mesero/pagos-pendientes').then(setPagosPendientes).catch(() => {})
    connectToRestaurante(user.restaurante_id)

    const onEstado = (d: any) => setMesas(prev => prev.map(m => m.id === d.mesaId ? { ...m, estado: d.estado } : m))
    const onLlamado = (d: any) => setLlamados(prev => [d, ...prev])
    const onAtendido = (d: any) => setLlamados(prev => prev.filter(l => l.id !== d.id))
    const onUnida = (d: any) => {
      setMesas(prev => prev.map(m => (m.id === d.mesa1 || m.id === d.mesa2) ? { ...m, estado: 'unida' } : m))
    }
    const onPagoSolicitado = (d: PagoPendiente) => {
      setPagosPendientes(prev => [d, ...prev])
    }
    const onPagoConfirmado = (d: any) => setPagosPendientes(prev => prev.filter(p => p.id !== d.pagoId))
    socket.on('mesa:estado', onEstado)
    socket.on('mesa:unida', onUnida)
    socket.on('llamado:nuevo', onLlamado)
    socket.on('llamado:atendido', onAtendido)
    socket.on('pago:solicitado', onPagoSolicitado)
    socket.on('pago:confirmado', onPagoConfirmado)
    return () => {
      socket.off('mesa:estado', onEstado); socket.off('llamado:nuevo', onLlamado); socket.off('llamado:atendido', onAtendido); socket.off('mesa:unida', onUnida); socket.off('pago:solicitado', onPagoSolicitado); socket.off('pago:confirmado', onPagoConfirmado)
    }
  }, [user.restaurante_id])

  async function cambiarEstado(mesaId: number, estado: string) {
    await api('/api/mesero/mesas/' + mesaId + '/estado', {
      method: 'PUT', body: JSON.stringify({ estado }),
    })
    setSel(null)
  }

  async function unirMesas() {
    if (!sel || !unirId) return
    await api('/api/mesero/mesas/' + sel.id + '/unir', {
      method: 'POST', body: JSON.stringify({ con_mesa_id: Number(unirId) }),
    })
    setSel(null); setUnirId('')
  }

  async function separar(mesaId: number) {
    await api('/api/mesero/mesas/' + mesaId + '/separar', { method: 'POST' })
    setSel(null)
  }

  async function atenderLlamado(id: number) {
    await api('/api/llamados/' + id + '/atender', { method: 'PUT' })
  }

  async function confirmarPago(pagoId: number) {
    await api('/api/pedidos/confirmar-pago/' + pagoId, { method: 'PUT' })
  }

  function pagoDeMesa(mesaId: number) {
    return pagosPendientes.find(p => p.mesa_id === mesaId)
  }

  return (
    <div className="min-h-screen text-foreground">
      {/* header matching comensal */}
      <div className="w-full border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-base font-medium shrink-0">Mesero</h1>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {llamados.length > 0 && !kanban && (
              <Button variant="destructive" size="xs" onClick={() => setSel(null)}>
                {llamados.length} llamado{llamados.length > 1 ? 's' : ''}
              </Button>
            )}
            <Button variant={kanban ? 'default' : 'outline'} size="xs" onClick={() => setKanban(!kanban)}>
              {kanban ? 'Mesas' : 'Pedidos'}
            </Button>
            <Button variant="ghost" size="xs" className="text-muted-foreground hover:text-foreground" onClick={() => { clearAppData(); navigate('/login') }}>
              Salir
            </Button>
          </div>
        </div>
      </div>

      {/* content */}
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {!kanban ? (<>
          {llamados.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 space-y-2">
              {llamados.map(l => (
                <div key={l.id} className="flex items-start justify-between gap-2 text-sm">
                  <div>
                    <span className="font-semibold">Mesa {l.mesa_numero}</span>
                    {l.usuario_nombre && <span className="text-muted-foreground ml-1">— {l.usuario_nombre}</span>}
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {l.tipo === 'cuenta' ? '🧾 Cuenta' : (l.mensaje || l.tipo)}
                      {l.tipo === 'cuenta' && l.split_preference && (() => {
                        const label = l.split_preference === 'iguales' ? 'Iguales' : l.split_preference === 'yo_invito' ? 'Yo invito' : 'Individual'
                        return <span className="ml-1 text-muted-foreground/60">· {label}{l.tip_preference ? ` (${l.tip_preference}% propina)` : ''}</span>
                      })()}
                    </p>
                  </div>
                  <Button size="xs" onClick={() => atenderLlamado(l.id)}>
                    Atender
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {mesas.map(m => {
              const pp = pagoDeMesa(m.id)
              return (
                <Card
                  key={m.id}
                  className={`rounded-md cursor-pointer border-l-4 ${ESTADO_ACCENT[m.estado] || 'border-l-muted-foreground/30'}`}
                  onClick={() => setSel(m)}
                >
                  <CardContent className="p-3 text-center relative">
                    {pp && (
                      <span className="absolute -top-1.5 -right-1.5 bg-orange-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        Pago
                      </span>
                    )}
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${ESTADO_DOT[m.estado] || 'bg-muted-foreground/30'}`} />
                      <p className="text-2xl font-bold">{m.numero}</p>
                    </div>
                    <p className="text-xs mt-1">{MESA_ESTADO_LABEL[m.estado] || m.estado}</p>
                    <p className="text-xs mt-0.5 text-muted-foreground">{m.comensales} comensal{m.comensales !== 1 ? 'es' : ''}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>) : (
          <MeseroKanban restauranteId={user.restaurante_id} onClose={() => setKanban(false)} />
        )}
      </div>

      {/* bottom sheet — detalle mesa */}
      {sel && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end justify-center" onClick={() => { setSel(null); setUnirId('') }}>
          <div className="bg-background w-full max-w-lg rounded-t-xl max-h-screen overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-background border-b border-border px-4 py-3 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Mesa {sel.numero}</span>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${ESTADO_BADGE[sel.estado] || ''}`}>
                  {MESA_ESTADO_LABEL[sel.estado] || sel.estado}
                </span>
              </div>
              <Button variant="outline" size="icon-xs" onClick={() => { setSel(null); setUnirId('') }}>
                ✕
              </Button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground">{sel.comensales} comensal{sel.comensales !== 1 ? 'es' : ''} · {sel.pedidos_activos} pedido{sel.pedidos_activos !== 1 ? 's' : ''} activo{sel.pedidos_activos !== 1 ? 's' : ''}</p>

              {sel.estado === 'libre' && (
                <Button className="w-full" onClick={() => cambiarEstado(sel.id, 'ocupada')}>
                  Ocupar mesa
                </Button>
              )}
              {sel.estado === 'ocupada' && (
                <div className="space-y-2">
                  {sel.pedidos_activos > 0 && (
                    <Button variant="outline" className="w-full" onClick={() => { setVerPedido(sel); setSel(null) }}>
                      Ver pedido ({sel.pedidos_activos})
                    </Button>
                  )}
                  <Button className="w-full" onClick={() => { setTomarPedido(sel); setSel(null) }}>
                    Tomar pedido
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => {
                    const last = llamados.find(l => l.mesa_id === sel.id && l.tipo === 'cuenta')
                    const ps = last?.split_preference || 'individual'
                    const pt = last?.tip_preference || 0
                    api<CuentaData>('/api/mesero/mesas/' + sel.id + '/cuenta').then(d => { setCuenta(d); setCuentaMesa(sel); setSplit(ps as any); setTip(pt); setYoInvitaIdx(0); setSel(null) })
                  }}>
                    Ver cuenta
                  </Button>
                  {(() => {
                    const pp = pagoDeMesa(sel.id)
                    if (!pp) return null
                    return (
                      <div className="bg-orange-50 border border-orange-200 rounded-md p-3 space-y-2">
                        <p className="text-xs font-semibold text-orange-700 uppercase tracking-wider">Pago pendiente</p>
                        <p className="text-sm text-orange-800">
                          {pp.metodo_pago === 'deposito' ? 'Depósito' : 'Efectivo'} — ${Number(pp.monto_total).toFixed(2)}
                        </p>
                        <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={() => confirmarPago(pp.id)}>
                          Confirmar pago recibido
                        </Button>
                      </div>
                    )
                  })()}
                  <Button variant="outline" className="w-full" onClick={() => cambiarEstado(sel.id, 'limpiando')}>
                    Cobrar y cerrar cuenta
                  </Button>
                  <div className="flex gap-2 items-center">
                    <Input placeholder="N° mesa a unir" value={unirId} onChange={e => setUnirId(e.target.value.replace(/\D/g, ''))} className="flex-1 bg-white" />
                    <Button variant="outline" onClick={unirMesas} disabled={!unirId}>Unir</Button>
                  </div>
                </div>
              )}
              {sel.estado === 'unida' && (
                <Button variant="outline" className="w-full" onClick={() => separar(sel.id)}>
                  Separar mesa
                </Button>
              )}
              {sel.estado === 'pagada' && (
                <Button className="w-full" onClick={() => cambiarEstado(sel.id, 'limpiando')}>
                  Pago verificado — limpiar mesa
                </Button>
              )}
              {sel.estado === 'limpiando' && (
                <Button className="w-full" onClick={() => cambiarEstado(sel.id, 'libre')}>
                  Marcar como libre
                </Button>
              )}
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => { setSel(null); setUnirId('') }}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* overlay — ver pedido */}
      {verPedido && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-border px-4 py-3 flex items-center justify-between z-10">
            <span className="font-bold text-lg">Mesa {verPedido.numero} — Pedido</span>
            <Button variant="outline" size="icon-xs" onClick={() => setVerPedido(null)}>✕</Button>
          </div>
          <PedidoActivo
            restauranteId={String(user.restaurante_id)}
            mesaId={String(verPedido.id)}
          />
        </div>
      )}

      {/* overlay — tomar pedido */}
      {tomarPedido && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <CartProvider cartKey={`mesero-${tomarPedido.id}`}>
            <div className="sticky top-0 bg-white border-b border-border px-4 py-3 flex items-center justify-between z-10">
              <span className="font-bold text-lg">Mesa {tomarPedido.numero} — Tomar pedido</span>
              <Button variant="outline" size="icon-xs" onClick={() => { setTomarPedido(null); setShowPre(false); setShowPA(false) }}>✕</Button>
            </div>
            {showPA ? (
              <div className="p-4 text-center space-y-4 py-12">
                <p className="text-green-600 font-semibold">✓ Pedido enviado a cocina</p>
                <Button onClick={() => { setTomarPedido(null); setShowPre(false); setShowPA(false) }}>
                  Cerrar
                </Button>
              </div>
            ) : showPre ? (
              <PrePedido
                restauranteId={String(user.restaurante_id)}
                mesaId={String(tomarPedido.id)}
                onClose={() => setShowPre(false)}
                onSuccess={() => { setShowPre(false); setShowPA(true) }}
              />
            ) : (
              <MenuDigital
                restauranteId={String(user.restaurante_id)}
                usuarioId={user.id || 0}
                usuarioNombre={user.nombre || 'Mesero'}
              />
            )}
          </CartProvider>
        </div>
      )}

      {/* overlay — ver cuenta */}
      {cuenta && cuentaMesa && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-border px-4 py-3 flex items-center justify-between z-10">
            <span className="font-bold text-lg">Mesa {cuentaMesa.numero} — Cuenta</span>
            <Button variant="outline" size="icon-xs" onClick={() => { setCuenta(null); setCuentaMesa(null) }}>✕</Button>
          </div>
          <div className="max-w-lg mx-auto p-4 space-y-4">
            {(() => {
              const groups: Record<number, { nombre: string; items: CuentaItem[]; pagados: CuentaItem[]; pendientes: CuentaItem[]; subtotal: number }> = {}
              for (const item of cuenta.items) {
                const uid = item.usuario_id || 0
                if (!groups[uid]) groups[uid] = { nombre: item.comensal_nombre || 'Comensal', items: [], pagados: [], pendientes: [], subtotal: 0 }
                groups[uid].items.push(item)
                groups[uid].subtotal += Number(item.precio_unitario) * item.cantidad
                if (item.pagado) groups[uid].pagados.push(item)
                else groups[uid].pendientes.push(item)
              }
              const personas = Object.values(groups)
              const total = personas.reduce((s, p) => s + p.subtotal, 0)
              const totalPendiente = personas.reduce((s, p) => s + p.pendientes.reduce((sum, i) => sum + Number(i.precio_unitario) * i.cantidad, 0), 0)
              const iva = cuenta.iva_incluido
                ? total - total / (1 + cuenta.iva_porcentaje / 100)
                : total * cuenta.iva_porcentaje / 100
              const ivaPendiente = total > 0 ? iva * totalPendiente / total : 0
              const totalConIvaPendiente = cuenta.iva_incluido ? totalPendiente : totalPendiente + ivaPendiente
              const tipAmount = totalConIvaPendiente * tip / 100
              const granTotal = totalConIvaPendiente + tipAmount
              const porPersona = split === 'iguales' ? granTotal / personas.length : 0
              const hayPagados = personas.some(p => p.pagados.length > 0)

              return (<>
                {hayPagados && (
                  <div className="text-xs text-green-600 bg-green-50 border border-green-100 rounded-md px-3 py-2">
                    Pagos parciales registrados — los items pagados aparecen tachados
                  </div>
                )}
                <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Split</div>
                <div className="flex gap-2">
                  {['individual', 'iguales', 'yo_invito'].map(s => (
                    <Button key={s} variant={split === s ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => setSplit(s as typeof split)}>
                      {s === 'individual' ? 'Individual' : s === 'iguales' ? 'Iguales' : 'Yo invito'}
                    </Button>
                  ))}
                </div>

                <div className="space-y-3">
                  {personas.map((p, i) => (
                    <Card key={i} className="rounded-md">
                      <CardContent className="p-3 text-sm">
                        <div className="flex justify-between font-semibold mb-2">
                          <span>{p.nombre}</span>
                          <span>${p.subtotal.toFixed(2)}</span>
                        </div>
                        {p.pendientes.map(it => (
                          <div key={it.id} className="flex justify-between text-muted-foreground ml-2 text-xs py-0.5">
                            <span>{it.cantidad}x {it.nombre || 'Platillo'}</span>
                            <span>${(Number(it.precio_unitario) * it.cantidad).toFixed(2)}</span>
                          </div>
                        ))}
                        {p.pagados.map(it => (
                          <div key={it.id} className="flex justify-between text-muted-foreground/40 ml-2 text-xs py-0.5 line-through">
                            <span>{it.cantidad}x {it.nombre || 'Platillo'}</span>
                            <span>${(Number(it.precio_unitario) * it.cantidad).toFixed(2)}</span>
                          </div>
                        ))}
                        {p.pagados.length > 0 && (
                          <div className="flex justify-between text-[10px] text-green-500 mt-1 pt-1 border-t border-dotted border-border">
                            <span>pagado</span>
                            <span>${p.pagados.reduce((s, it) => s + Number(it.precio_unitario) * it.cantidad, 0).toFixed(2)}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="border-t border-border pt-3 space-y-1 text-sm">
                  <div className="flex justify-between text-muted-foreground"><span>Subtotal total</span><span>${total.toFixed(2)}</span></div>
                  {hayPagados && <div className="flex justify-between text-green-500 text-xs"><span>Pagado</span><span>-${(total - totalPendiente).toFixed(2)}</span></div>}
                  <div className="flex justify-between font-medium"><span>Subtotal pendiente</span><span>${totalPendiente.toFixed(2)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>IVA ({cuenta.iva_porcentaje}%)</span><span>${ivaPendiente.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Propina ({tip}%)</span><span>${tipAmount.toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold text-base pt-2 border-t border-border"><span>Total a cobrar</span><span>${granTotal.toFixed(2)}</span></div>
                </div>

                <div className="flex gap-2 items-center">
                  <span className="text-xs text-muted-foreground">Propina:</span>
                  {[0, 10, 15, 20].map(t => (
                    <Button key={t} variant={tip === t ? 'default' : 'outline'} size="xs" onClick={() => setTip(t)}>
                      {t}%
                    </Button>
                  ))}
                </div>

                {split === 'individual' && (
                  <Card className="rounded-md">
                    <CardContent className="p-3 text-sm space-y-1">
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
                    </CardContent>
                  </Card>
                )}
                {split === 'iguales' && (
                  <Card className="rounded-md">
                    <CardContent className="p-3 text-sm flex justify-between">
                      <span>Cada quien</span>
                      <span className="font-semibold">${porPersona.toFixed(2)}</span>
                    </CardContent>
                  </Card>
                )}
                {split === 'yo_invito' && (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">¿Quién invita?</div>
                    <div className="flex gap-2 flex-wrap">
                      {personas.map((p, i) => (
                        <Button key={i} variant={yoInvitaIdx === i ? 'default' : 'outline'} size="sm" onClick={() => setYoInvitaIdx(i)}>
                          {p.nombre}
                        </Button>
                      ))}
                    </div>
                    <Card className="rounded-md">
                      <CardContent className="p-3 text-sm space-y-1">
                        {personas.map((p, i) => (
                          <div key={i} className="flex justify-between">
                            <span>{p.nombre}</span>
                            <span className={i === yoInvitaIdx ? 'font-semibold' : 'text-muted-foreground'}>
                              {i === yoInvitaIdx ? `$${granTotal.toFixed(2)}` : '$0.00'}
                            </span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                )}

                <Button className="w-full" onClick={async () => {
                  await api('/api/mesero/mesas/' + cuentaMesa.id + '/cobrar', {
                    method: 'POST',
                    body: JSON.stringify({ split, tip, tip_monto: tipAmount }),
                  })
                  setCuenta(null); setCuentaMesa(null)
                }}>
                  Cobrar ${granTotal.toFixed(2)}
                </Button>
              </>)
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
