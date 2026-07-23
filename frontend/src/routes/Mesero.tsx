import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

interface Llamado {
  id: number; mesa_id: number; mesa_numero: number; tipo: string; mensaje: string | null
  usuario_nombre: string; created_at: string
  split_preference: string | null; tip_preference: number | null
}

const ESTADO_CLASS: Record<string, string> = {
  libre: 'bg-green-100 border-green-300 text-green-800',
  ocupada: 'bg-red-100 border-red-300 text-red-800',
  unida: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  pagada: 'bg-blue-100 border-blue-300 text-blue-800',
  limpiando: 'bg-amber-100 border-amber-300 text-amber-800',
}

interface CuentaItem {
  id: number; platillo_id: number; usuario_id: number | null; cantidad: number
  precio_unitario: string; estado: string; notas: string | null
  nombre: string; comensal_nombre: string | null
}

interface CuentaData {
  items: CuentaItem[]; iva_porcentaje: number; iva_incluido: boolean; mesa_id: number
}

export default function Mesero() {
  const navigate = useNavigate()
  const [mesas, setMesas] = useState<MesaInfo[]>([])
  const [llamados, setLlamados] = useState<Llamado[]>([])
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
    connectToRestaurante(user.restaurante_id)

    const onEstado = (d: any) => setMesas(prev => prev.map(m => m.id === d.mesaId ? { ...m, estado: d.estado } : m))
    const onLlamado = (d: any) => setLlamados(prev => [d, ...prev])
    const onAtendido = (d: any) => setLlamados(prev => prev.filter(l => l.id !== d.id))
    const onUnida = (d: any) => {
      setMesas(prev => prev.map(m => (m.id === d.mesa1 || m.id === d.mesa2) ? { ...m, estado: 'unida' } : m))
    }
    socket.on('mesa:estado', onEstado)
    socket.on('mesa:unida', onUnida)
    socket.on('llamado:nuevo', onLlamado)
    socket.on('llamado:atendido', onAtendido)
    return () => {
      socket.off('mesa:estado', onEstado); socket.off('llamado:nuevo', onLlamado); socket.off('llamado:atendido', onAtendido); socket.off('mesa:unida', onUnida)
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

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Mesero</h1>
          <div className="flex gap-2">
            {llamados.length > 0 && !kanban && (
              <button onClick={() => setSel(null)} className="text-xs bg-red-500 text-white px-3 py-1 rounded-full">
                {llamados.length} llamado{llamados.length > 1 ? 's' : ''}
              </button>
            )}
            <button onClick={() => setKanban(!kanban)} className={`text-xs px-3 py-1 rounded-full border ${kanban ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-500'}`}>
              {kanban ? 'Mesas' : 'Pedidos'}
            </button>
            <button onClick={() => { clearAppData(); navigate('/login') }} className="text-xs text-gray-400 hover:text-black">
              Salir
            </button>
          </div>
        </div>

        {!kanban ? (<>
          {llamados.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 space-y-2">
              {llamados.map(l => (
                <div key={l.id} className="flex items-start justify-between gap-2 text-sm">
                  <div>
                    <span className="font-semibold">Mesa {l.mesa_numero}</span>
                    {l.usuario_nombre && <span className="text-gray-500 ml-1">— {l.usuario_nombre}</span>}
                    <p className="text-gray-600 text-xs mt-0.5">
                      {l.tipo === 'cuenta' ? '🧾 Cuenta' : (l.mensaje || l.tipo)}
                      {l.tipo === 'cuenta' && l.split_preference && (() => {
                        const label = l.split_preference === 'iguales' ? 'Iguales' : l.split_preference === 'yo_invito' ? 'Yo invito' : 'Individual'
                        return <span className="ml-1 text-gray-400">· {label}{l.tip_preference ? ` (${l.tip_preference}% propina)` : ''}</span>
                      })()}
                    </p>
                  </div>
                  <button onClick={() => atenderLlamado(l.id)} className="text-xs bg-black text-white px-2 py-1 rounded-md shrink-0">
                    Atender
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {mesas.map(m => (
              <button
                key={m.id}
                onClick={() => setSel(m)}
                className={`border-2 rounded-xl p-4 text-center transition hover:shadow-md ${ESTADO_CLASS[m.estado] || 'border-gray-200'}`}
              >
                <p className="text-2xl font-bold">{m.numero}</p>
                <p className="text-xs mt-1">{MESA_ESTADO_LABEL[m.estado] || m.estado}</p>
                <p className="text-xs mt-1 opacity-60">{m.comensales} comensal{m.comensales !== 1 ? 'es' : ''}</p>
              </button>
            ))}
          </div>
        </>) : (
          <MeseroKanban restauranteId={user.restaurante_id} onClose={() => setKanban(false)} />
        )}

        {sel && (
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => { setSel(null); setUnirId('') }}>
            <div className="absolute bottom-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 shadow-xl space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg">Mesa {sel.numero}</h2>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${ESTADO_CLASS[sel.estado] || ''}`}>
                  {MESA_ESTADO_LABEL[sel.estado] || sel.estado}
                </span>
              </div>

              <p className="text-sm text-gray-500">{sel.comensales} comensal{sel.comensales !== 1 ? 'es' : ''} · {sel.pedidos_activos} pedido{sel.pedidos_activos !== 1 ? 's' : ''} activo{sel.pedidos_activos !== 1 ? 's' : ''}</p>

              {sel.estado === 'libre' && (
                <button onClick={() => cambiarEstado(sel.id, 'ocupada')} className="w-full bg-black text-white py-2 rounded-md text-sm">
                  Ocupar mesa
                </button>
              )}
              {sel.estado === 'ocupada' && (
                <div className="space-y-2">
                  {sel.pedidos_activos > 0 && (
                    <button onClick={() => { setVerPedido(sel); setSel(null) }} className="w-full border border-black text-black py-2 rounded-md text-sm">
                      Ver pedido ({sel.pedidos_activos})
                    </button>
                  )}
                  <button onClick={() => { setTomarPedido(sel); setSel(null) }} className="w-full bg-black text-white py-2 rounded-md text-sm">
                    Tomar pedido
                  </button>
                  <button onClick={() => {
                    const last = llamados.find(l => l.mesa_id === sel.id && l.tipo === 'cuenta')
                    const ps = last?.split_preference || 'individual'
                    const pt = last?.tip_preference || 0
                    api<CuentaData>('/api/mesero/mesas/' + sel.id + '/cuenta').then(d => { setCuenta(d); setCuentaMesa(sel); setSplit(ps as any); setTip(pt); setYoInvitaIdx(0); setSel(null) })
                  }} className="w-full border border-black text-black py-2 rounded-md text-sm">
                    Ver cuenta
                  </button>
                  <button onClick={() => cambiarEstado(sel.id, 'limpiando')} className="w-full border border-black text-black py-2 rounded-md text-sm">
                    Cobrar y cerrar cuenta
                  </button>
                  <div className="flex gap-2 items-center">
                    <input placeholder="N° mesa a unir" value={unirId} onChange={e => setUnirId(e.target.value.replace(/\D/g, ''))} className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm outline-none" />
                    <button onClick={unirMesas} disabled={!unirId} className="bg-gray-200 text-gray-600 px-3 py-2 rounded-md text-sm disabled:opacity-50">Unir</button>
                  </div>
                </div>
              )}
              {sel.estado === 'unida' && (
                <button onClick={() => separar(sel.id)} className="w-full bg-gray-200 text-gray-600 py-2 rounded-md text-sm">
                  Separar mesa
                </button>
              )}
              {sel.estado === 'pagada' && (
                <button onClick={() => cambiarEstado(sel.id, 'limpiando')} className="w-full bg-black text-white py-2 rounded-md text-sm">
                  Pago verificado — limpiar mesa
                </button>
              )}
              {sel.estado === 'limpiando' && (
                <button onClick={() => cambiarEstado(sel.id, 'libre')} className="w-full bg-black text-white py-2 rounded-md text-sm">
                  Marcar como libre
                </button>
              )}
              <button onClick={() => { setSel(null); setUnirId('') }} className="w-full text-gray-400 text-sm py-2">Cerrar</button>
            </div>
          </div>
        )}

        {verPedido && (
          <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
              <span className="font-bold text-lg">Mesa {verPedido.numero} — Pedido</span>
              <button onClick={() => setVerPedido(null)} className="text-gray-400 hover:text-black text-xl">✕</button>
            </div>
            <PedidoActivo
              restauranteId={String(user.restaurante_id)}
              mesaId={String(verPedido.id)}
            />
          </div>
        )}

        {tomarPedido && (
          <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
            <CartProvider cartKey={`mesero-${tomarPedido.id}`}>
              <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
                <span className="font-bold text-lg">Mesa {tomarPedido.numero} — Tomar pedido</span>
                <button onClick={() => { setTomarPedido(null); setShowPre(false); setShowPA(false) }} className="text-gray-400 hover:text-black text-xl">✕</button>
              </div>
              {showPA ? (
                <div className="p-4 text-center space-y-4 py-12">
                  <p className="text-green-600 font-semibold">✓ Pedido enviado a cocina</p>
                  <button onClick={() => { setTomarPedido(null); setShowPre(false); setShowPA(false) }} className="bg-black text-white px-6 py-2 rounded-md text-sm">
                    Cerrar
                  </button>
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

        {cuenta && cuentaMesa && (
          <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
              <span className="font-bold text-lg">Mesa {cuentaMesa.numero} — Cuenta</span>
              <button onClick={() => { setCuenta(null); setCuentaMesa(null) }} className="text-gray-400 hover:text-black text-xl">✕</button>
            </div>
            <div className="max-w-lg mx-auto p-4 space-y-4">
              {(() => {
                const groups: Record<number, { nombre: string; items: CuentaItem[]; subtotal: number }> = {}
                for (const item of cuenta.items) {
                  const uid = item.usuario_id || 0
                  if (!groups[uid]) groups[uid] = { nombre: item.comensal_nombre || 'Comensal', items: [], subtotal: 0 }
                  groups[uid].items.push(item)
                  groups[uid].subtotal += Number(item.precio_unitario) * item.cantidad
                }
                const personas = Object.values(groups)
                const total = personas.reduce((s, p) => s + p.subtotal, 0)
                const iva = cuenta.iva_incluido
                  ? total - total / (1 + cuenta.iva_porcentaje / 100)
                  : total * cuenta.iva_porcentaje / 100
                const totalConIva = cuenta.iva_incluido ? total : total + iva
                const tipAmount = totalConIva * tip / 100
                const granTotal = totalConIva + tipAmount
                const porPersona = split === 'iguales' ? granTotal / personas.length : 0

                return (<>
                  <div className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Split</div>
                  <div className="flex gap-2">
                    {['individual', 'iguales', 'yo_invito'].map(s => (
                      <button key={s} onClick={() => setSplit(s as typeof split)}
                        className={`flex-1 py-2 rounded-md text-sm border ${split === s ? 'bg-black text-white border-black' : 'border-gray-200'}`}>
                        {s === 'individual' ? 'Individual' : s === 'iguales' ? 'Iguales' : 'Yo invito'}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    {personas.map((p, i) => { return (
                        <div key={i} className="border border-gray-200 rounded-md p-3 text-sm">
                          <div className="flex justify-between font-semibold mb-2">
                            <span>{p.nombre}</span>
                            <span>${p.subtotal.toFixed(2)}</span>
                          </div>
                          {p.items.map(it => (
                            <div key={it.id} className="flex justify-between text-gray-500 ml-2 text-xs py-0.5">
                              <span>{it.cantidad}x {it.nombre || 'Platillo'}</span>
                              <span>${(Number(it.precio_unitario) * it.cantidad).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>

                  <div className="border-t border-gray-200 pt-3 space-y-1 text-sm">
                    <div className="flex justify-between"><span>Subtotal</span><span>${total.toFixed(2)}</span></div>
                    <div className="flex justify-between text-gray-500"><span>IVA ({cuenta.iva_porcentaje}%)</span><span>${iva.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Propina ({tip}%)</span><span>${tipAmount.toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200"><span>Total</span><span>${granTotal.toFixed(2)}</span></div>
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

                  {split === 'individual' && (
                    <div className="border border-gray-200 rounded-md p-3 text-sm space-y-1">
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
                    <div className="border border-gray-200 rounded-md p-3 text-sm flex justify-between">
                      <span>Cada quien</span>
                      <span className="font-semibold">${porPersona.toFixed(2)}</span>
                    </div>
                  )}
                  {split === 'yo_invito' && (
                    <div className="space-y-2">
                      <div className="text-xs text-gray-400 uppercase tracking-wide font-semibold">¿Quién invita?</div>
                      <div className="flex gap-2 flex-wrap">
                        {personas.map((p, i) => (
                          <button key={i} onClick={() => setYoInvitaIdx(i)}
                            className={`px-4 py-2 rounded-md text-sm border ${yoInvitaIdx === i ? 'bg-black text-white border-black' : 'border-gray-200'}`}>
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

                  <button onClick={() => { cambiarEstado(cuentaMesa.id, 'limpiando'); setCuenta(null); setCuentaMesa(null) }}
                    className="w-full bg-black text-white py-3 rounded-md text-sm font-semibold">
                    Cobrar ${granTotal.toFixed(2)}
                  </button>
                </>)
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
