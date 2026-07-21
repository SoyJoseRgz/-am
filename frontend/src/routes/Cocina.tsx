import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { connectToRestaurante, socket } from '../services/socket'

interface ModInfo { id: number; nombre: string; precio: string }
interface ItemInfo {
  id: number; pedido_id: number; platillo_id: number; nombre: string
  cantidad: number; precio_unitario: string
  estado: string; notas: string | null; created_at: string
  modificadores: ModInfo[]
}
interface PedidoInfo {
  id: number; mesa_id: number; mesa_numero: number
  comensal_nombre: string | null; created_at: string
  items: ItemInfo[]
}

const ESTADOS = ['pendiente', 'preparando', 'listo', 'entregado'] as const
const ESTADO_LABEL: Record<string, string> = { pendiente: 'Pendiente', preparando: 'Preparando', listo: 'Listo', entregado: 'Entregado', cancelado: 'Cancelado' }
const ESTADO_DOT: Record<string, string> = { pendiente: 'bg-yellow-400', preparando: 'bg-blue-400', listo: 'bg-green-400', entregado: 'bg-gray-300', cancelado: 'bg-red-400' }
const ESTADO_BG: Record<string, string> = { pendiente: 'bg-yellow-100 text-yellow-800', preparando: 'bg-blue-100 text-blue-800', listo: 'bg-green-100 text-green-800', entregado: 'bg-gray-100 text-gray-500', cancelado: 'bg-red-100 text-red-800' }

function ItemTimer({ created_at }: { created_at: string }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t) }, [])
  const min = Math.floor((now - new Date(created_at).getTime()) / 60000)
  return <span className="text-xs text-gray-400">{min < 1 ? '<1m' : min + 'm'}</span>
}

export default function Cocina() {
  const navigate = useNavigate()
  const [pedidos, setPedidos] = useState<PedidoInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [kanban, setKanban] = useState(true)
  const [selItem, setSelItem] = useState<(ItemInfo & { mesa_numero: number }) | null>(null)
  const [cancelMotivo, setCancelMotivo] = useState('')

  function cargar() {
    api<PedidoInfo[]>('/api/cocina/pedidos')
      .then(d => { setPedidos(d); setLoading(false) })
      .catch(() => { setLoading(false) })
  }

  useEffect(() => {
    cargar()
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const restauranteId = user.restaurante_id
    if (restauranteId) {
      connectToRestaurante(restauranteId)
    }
    const onConnect = () => { if (restauranteId) socket.emit('join:restaurante', restauranteId) }
    const onConnectError = (err: Error) => console.error('[Cocina] Socket connect error:', err.message)
    socket.on('connect', onConnect)
    socket.on('connect_error', onConnectError)
    const h = () => cargar()
    socket.on('pedido:nuevo', h)
    socket.on('item:actualizado', h)
    return () => {
      socket.off('connect', onConnect)
      socket.off('connect_error', onConnectError)
      socket.off('pedido:nuevo', h); socket.off('item:actualizado', h)
      if (restauranteId) socket.emit('leave:restaurante', restauranteId)
    }
  }, [])

  async function setEstado(item: ItemInfo & { mesa_numero: number }, estado: string, motivo?: string) {
    setSelItem(null); setCancelMotivo('')
    if (item.estado === estado) return
    try { await api(`/api/cocina/pedidos/${item.pedido_id}/items/${item.id}`, { method: 'PUT', body: JSON.stringify({ estado, motivo }) }) } catch {}
  }

  const activos = pedidos.filter(p => p.items.some(i => i.estado !== 'entregado' && i.estado !== 'cancelado'))
  const completados = pedidos.filter(p => p.items.every(i => i.estado === 'entregado'))
  const cancelados = pedidos.flatMap(p => p.items.map(i => ({ ...i, mesa_numero: p.mesa_numero }))).filter(i => i.estado === 'cancelado')

  const agrupados = ESTADOS.reduce((acc, est) => {
    acc[est] = pedidos.flatMap(p => p.items.map(i => ({ ...i, mesa_numero: p.mesa_numero }))).filter(i => i.estado === est)
    return acc
  }, {} as Record<string, (ItemInfo & { mesa_numero: number })[]>)

  if (loading) return <div className="min-h-screen bg-white text-black flex items-center justify-center"><p className="text-gray-500">Cargando pedidos...</p></div>

  function ItemCard({ item }: { item: ItemInfo & { mesa_numero: number } }) {
    const cancelado = item.estado === 'cancelado'
    const esCancel = item.notas?.startsWith('CANCELADO:')
    return (
      <button onClick={() => !cancelado && setSelItem(item)}
        className={`w-full text-left bg-white border border-gray-200 rounded-md p-3 border-l-4 hover:shadow-md transition ${
          cancelado ? 'border-l-red-400 opacity-60' : item.estado === 'pendiente' ? 'border-l-yellow-500' : item.estado === 'preparando' ? 'border-l-blue-500' : item.estado === 'listo' ? 'border-l-green-500' : 'border-l-gray-300'
        }`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className={`font-bold text-sm ${cancelado ? 'line-through text-red-500' : ''}`}>Mesa {item.mesa_numero}</p>
              {!cancelado && <ItemTimer created_at={item.created_at} />}
            </div>
            <p className={`text-sm mt-0.5 ${cancelado ? 'line-through text-red-400' : ''}`}>{item.cantidad > 1 && <span className="text-gray-400">{item.cantidad}x </span>}{item.nombre}</p>
            {item.modificadores.length > 0 && <p className="text-gray-400 text-xs mt-0.5">{item.modificadores.map(m => m.nombre).join(', ')}</p>}
            {item.notas && <p className={`text-xs mt-0.5 italic ${cancelado ? 'text-red-500' : 'text-orange-600'}`}>{esCancel ? '✕ ' + item.notas : 'Nota: ' + item.notas}</p>}
          </div>
          <span className={`shrink-0 w-2.5 h-2.5 rounded-full mt-1 ${ESTADO_DOT[item.estado]}`} />
        </div>
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Cocina</h1>
          <div className="flex gap-2">
            <button onClick={() => setKanban(!kanban)} className={`text-xs px-3 py-1 rounded-full border ${kanban ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-500'}`}>
              {kanban ? 'Kanban' : 'Por mesa'}
            </button>
            <button onClick={() => { localStorage.clear(); navigate('/login') }} className="text-sm text-gray-400 hover:text-black">Cerrar sesión</button>
          </div>
        </div>

        {activos.length === 0 && completados.length === 0 && (
          <p className="text-gray-400 text-center py-8">No hay pedidos aún</p>
        )}

        {kanban ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ESTADOS.filter(e => e !== 'entregado').map(est => (
              <div key={est}>
                <h3 className="font-semibold text-sm mb-3 text-gray-500">{ESTADO_LABEL[est]} ({agrupados[est].length})</h3>
                <div className="space-y-2">
                  {agrupados[est].length === 0 && <p className="text-xs text-gray-300 italic">Sin {ESTADO_LABEL[est].toLowerCase()}</p>}
                  {agrupados[est].map(item => <ItemCard key={item.id} item={item} />)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activos.map(p => (
                <div key={p.id} className="bg-white border border-gray-200 rounded-md overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <div><span className="font-bold">Mesa {p.mesa_numero}</span><span className="text-gray-400 text-sm ml-2">#{p.id}</span></div>
                    <span className="text-xs text-gray-400">{new Date(p.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="p-4 space-y-2">
                    {p.items.map(item => <ItemCard key={item.id} item={{ ...item, mesa_numero: p.mesa_numero }} />)}
                  </div>
                </div>
              ))}
            </div>
            {completados.length > 0 && (
              <>
                <h2 className="text-lg font-semibold text-gray-500 mt-8">Entregados</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-60">
                  {completados.map(p => (
                    <div key={p.id} className="bg-white border border-gray-200 rounded-md overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <span className="font-bold">Mesa {p.mesa_numero}</span>
                        <span className="text-gray-400 text-sm ml-2">#{p.id}</span>
                      </div>
                      <div className="p-4 space-y-2">
                        {p.items.map(item => <ItemCard key={item.id} item={{ ...item, mesa_numero: p.mesa_numero }} />)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {selItem && (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={() => { setSelItem(null); setCancelMotivo('') }}>
          <div className="absolute bottom-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 shadow-xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-bold">Mesa {selItem.mesa_numero}</p>
                <p className="text-lg font-semibold mt-1">{selItem.cantidad > 1 && <span className="text-gray-400">{selItem.cantidad}x </span>}{selItem.nombre}</p>
                {selItem.modificadores.length > 0 && <p className="text-gray-400 text-sm mt-1">{selItem.modificadores.map(m => m.nombre).join(', ')}</p>}
                {selItem.notas && <p className="text-orange-600 text-sm mt-1 italic">Nota: {selItem.notas}</p>}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${ESTADO_BG[selItem.estado]}`}>{ESTADO_LABEL[selItem.estado]}</span>
            </div>
            {selItem.estado !== 'cancelado' ? (
              <>
                {!cancelMotivo ? (
                  <>
                    <p className="text-sm text-gray-500 font-medium">Cambiar estado:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {ESTADOS.map(est => (
                        <button key={est} onClick={() => setEstado(selItem, est)}
                          disabled={selItem.estado === est}
                          className={`py-2.5 rounded-md text-sm font-medium transition ${
                            selItem.estado === est
                              ? `${ESTADO_BG[est]} cursor-default`
                              : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                          }`}>
                          {ESTADO_LABEL[est]}
                        </button>
                      ))}
                      <button onClick={() => setCancelMotivo(' ')}
                        className="py-2.5 rounded-md text-sm font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 col-span-2">
                        Cancelar (falta ingrediente)
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-500 font-medium">Motivo de cancelación:</p>
                    <textarea autoFocus value={cancelMotivo === ' ' ? '' : cancelMotivo} onChange={e => setCancelMotivo(e.target.value)}
                      className="w-full p-3 rounded-md bg-gray-50 border border-gray-200 focus:border-gray-400 outline-none text-sm resize-none"
                      rows={3} placeholder="Ej: se fue el pollo, no hay tortillas..." />
                    <div className="flex gap-2">
                      <button onClick={() => setCancelMotivo('')}
                        className="flex-1 py-2.5 rounded-md text-sm font-medium bg-gray-50 border border-gray-200 hover:bg-gray-100">
                        Volver
                      </button>
                      <button onClick={() => setEstado(selItem, 'cancelado', cancelMotivo || 'Sin motivo')}
                        disabled={!cancelMotivo.trim()}
                        className="flex-1 py-2.5 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">
                        Confirmar cancelación
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-red-600 italic">{selItem.notas}</p>
            )}
          </div>
        </div>
      )}

      {cancelados.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 pb-4">
          <h2 className="text-sm font-semibold text-red-400 mb-2">Cancelados ({cancelados.length})</h2>
          <div className="flex flex-wrap gap-2">
            {cancelados.map(i => (
              <span key={i.id} className="text-xs text-red-400 bg-red-50 px-2 py-1 rounded-md line-through">
                Mesa {i.mesa_numero}: {i.nombre}{i.notas ? ' — ' + i.notas.replace('CANCELADO: ', '') : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
