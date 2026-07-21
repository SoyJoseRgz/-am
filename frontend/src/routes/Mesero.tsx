import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { connectToRestaurante, socket } from '../services/socket'
import { CartProvider } from '../stores/CartContext'
import MenuDigital from './MenuDigital'
import PrePedido from './PrePedido'
import PedidoActivo from './PedidoActivo'

interface MesaInfo {
  id: number; numero: number; estado: string; comensales: number; pedidos_activos: number
}

interface Llamado {
  id: number; mesa_id: number; mesa_numero: number; tipo: string; mensaje: string | null
  usuario_nombre: string; created_at: string
}

const ESTADO_LABEL: Record<string, string> = {
  libre: 'Libre', ocupada: 'Ocupada', unida: 'Unida', limpiando: 'Limpiando',
}

const ESTADO_CLASS: Record<string, string> = {
  libre: 'bg-green-100 border-green-300 text-green-800',
  ocupada: 'bg-red-100 border-red-300 text-red-800',
  unida: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  limpiando: 'bg-amber-100 border-amber-300 text-amber-800',
}

export default function Mesero() {
  const navigate = useNavigate()
  const [mesas, setMesas] = useState<MesaInfo[]>([])
  const [llamados, setLlamados] = useState<Llamado[]>([])
  const [sel, setSel] = useState<MesaInfo | null>(null)
  const [unirId, setUnirId] = useState('')
  const [tomarPedido, setTomarPedido] = useState<MesaInfo | null>(null)
  const [verPedido, setVerPedido] = useState<MesaInfo | null>(null)
  const [showPre, setShowPre] = useState(false)
  const [showPA, setShowPA] = useState(false)
  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} } })()

  useEffect(() => {
    if (!user.restaurante_id) return
    api<MesaInfo[]>('/api/mesero/mesas').then(setMesas).catch(() => {})
    api<Llamado[]>('/api/llamados/restaurante/' + user.restaurante_id).then(setLlamados).catch(() => {})
    connectToRestaurante(user.restaurante_id)

    const onEstado = (d: any) => setMesas(prev => prev.map(m => m.id === d.mesaId ? { ...m, estado: d.estado } : m))
    const onLlamado = (d: any) => setLlamados(prev => [d, ...prev])
    const onAtendido = (d: any) => setLlamados(prev => prev.filter(l => l.id !== d.id))
    socket.on('mesa:estado', onEstado)
    socket.on('mesa:unida', (d: any) => {
      setMesas(prev => prev.map(m => (m.id === d.mesa1 || m.id === d.mesa2) ? { ...m, estado: 'unida' } : m))
    })
    socket.on('llamado:nuevo', onLlamado)
    socket.on('llamado:atendido', onAtendido)
    return () => {
      socket.off('mesa:estado', onEstado); socket.off('llamado:nuevo', onLlamado); socket.off('llamado:atendido', onAtendido)
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
            {llamados.length > 0 && (
              <button onClick={() => setSel(null)} className="text-xs bg-red-500 text-white px-3 py-1 rounded-full">
                {llamados.length} llamado{llamados.length > 1 ? 's' : ''}
              </button>
            )}
            <button onClick={() => { localStorage.clear(); navigate('/login') }} className="text-xs text-gray-400 hover:text-black">
              Salir
            </button>
          </div>
        </div>

        {llamados.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 space-y-2">
            {llamados.map(l => (
              <div key={l.id} className="flex items-start justify-between gap-2 text-sm">
                <div>
                  <span className="font-semibold">Mesa {l.mesa_numero}</span>
                  {l.usuario_nombre && <span className="text-gray-500 ml-1">— {l.usuario_nombre}</span>}
                  <p className="text-gray-600 text-xs mt-0.5">{l.mensaje || l.tipo}</p>
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
              <p className="text-xs mt-1">{ESTADO_LABEL[m.estado] || m.estado}</p>
              <p className="text-xs mt-1 opacity-60">{m.comensales} comensal{m.comensales !== 1 ? 'es' : ''}</p>
            </button>
          ))}
        </div>

        {sel && (
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => { setSel(null); setUnirId('') }}>
            <div className="absolute bottom-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 shadow-xl space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg">Mesa {sel.numero}</h2>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${ESTADO_CLASS[sel.estado] || ''}`}>
                  {ESTADO_LABEL[sel.estado] || sel.estado}
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
              onClose={() => setVerPedido(null)}
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
                  onClose={() => setTomarPedido(null)}
                  onCartClick={() => setShowPre(true)}
                />
              )}
            </CartProvider>
          </div>
        )}
      </div>
    </div>
  )
}
