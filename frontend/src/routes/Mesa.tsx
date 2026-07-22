import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { api, getCurrentUser } from '../services/api'
import { connectToMesa, socket } from '../services/socket'
import { MESA_ESTADO_LABEL } from '../constants/estados'
import { CartProvider, useCart } from '../stores/CartContext'
import MenuDigital from './MenuDigital'
import PrePedido from './PrePedido'
import PedidoActivo from './PedidoActivo'

interface MesaData {
  id: number
  numero: number
  estado: string
}

interface Comensal {
  usuario_id: number
  nombre: string
  celular: string
}

function MesaInner() {
  const { restauranteId, mesaId } = useParams()
  const navigate = useNavigate()
  const [mesa, setMesa] = useState<MesaData | null>(null)
  const [comensales, setComensales] = useState<Comensal[]>([])
  const [codigoInput, setCodigoInput] = useState('')
  const [codigoInvitacion, setCodigoInvitacion] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [needsCode, setNeedsCode] = useState(false)
  const [joinAttempted, setJoinAttempted] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [tienePedido, setTienePedido] = useState(false)
  const [showLlamar, setShowLlamar] = useState(false)
  const [llamarMensaje, setLlamarMensaje] = useState('')
  const [llamarEnviando, setLlamarEnviando] = useState(false)
  const [llamarExito, setLlamarExito] = useState(false)
  const [showPrePedido, setShowPrePedido] = useState(false)
  const [showPedidoActivo, setShowPedidoActivo] = useState(false)
  const [cuentaCerrada, setCuentaCerrada] = useState(false)
  const location = useLocation()
  const { items } = useCart()

  useEffect(() => {
    if (location.state?.openMenu) {
      setShowMenu(true)
      window.history.replaceState({}, document.title)
    }
  }, [location.state])
  const currentUser = getCurrentUser()
  const usuarioId = currentUser.id || 0
  const usuarioNombre = currentUser.nombre || ''

  const cartCount = items.filter(i => i.usuarioId === usuarioId).reduce((s, i) => s + i.cantidad, 0)

  const join = useCallback(async (codigo?: string) => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      navigate(`/login?redirect=/m/${restauranteId}/${mesaId}`)
      return
    }

    setLoading(true)
    setError('')
    setJoinAttempted(true)

    try {
      const data = await api('/api/mesas/' + mesaId + '/join', {
        method: 'POST',
        body: JSON.stringify({ restaurante_id: Number(restauranteId), codigo: codigo || undefined }),
      }) as any

      setMesa(data.mesa)
      if (data.codigo_invitacion) {
        setCodigoInvitacion(data.codigo_invitacion)
      }
      connectToMesa(Number(restauranteId), Number(mesaId))
    } catch (e: any) {
      if (e.message === 'Código de invitación requerido') {
        setNeedsCode(true)
        setLoading(false)
        return
      }
      setError(e.message || 'Error al unirse')
    } finally {
      setLoading(false)
    }
  }, [restauranteId, mesaId, navigate])

  useEffect(() => {
    join()

    socket.on('comensal:unido', () => {
      api('/api/mesas/' + mesaId + '?restaurante_id=' + restauranteId)
        .then((d: any) => {
          setComensales(d.comensales || [])
          if (d.codigo_invitacion) setCodigoInvitacion(d.codigo_invitacion)
        })
    })
    socket.on('pedido:creado', () => setTienePedido(true))
    socket.on('item:actualizado', () => {
      api<any[]>('/api/pedidos/mesa/' + mesaId)
        .then(data => setTienePedido(Array.isArray(data) && data.length > 0))
        .catch(() => {})
    })
    socket.on('mesa:estado', (d: any) => {
      if (d.mesaId === Number(mesaId)) {
        setMesa(prev => prev ? { ...prev, estado: d.estado } : prev)
        if (d.estado === 'limpiando') setCuentaCerrada(true)
      }
    })

    return () => {
      socket.off('comensal:unido')
      socket.off('pedido:creado')
      socket.off('item:actualizado')
      socket.off('mesa:estado')
    }
  }, [join, mesaId, restauranteId])

  useEffect(() => {
    if (cuentaCerrada) {
      const t = setTimeout(() => { localStorage.clear(); navigate('/') }, 5000)
      return () => clearTimeout(t)
    }
  }, [cuentaCerrada, navigate])

  useEffect(() => {
    if (!mesa) return
    api('/api/mesas/' + mesaId + '?restaurante_id=' + restauranteId)
      .then((d: any) => {
        setComensales(d.comensales || [])
        if (d.codigo_invitacion) setCodigoInvitacion(d.codigo_invitacion)
      })
    api<any[]>('/api/pedidos/mesa/' + mesaId)
      .then(data => setTienePedido(Array.isArray(data) && data.length > 0))
      .catch(() => {})
  }, [mesa])

  if (loading && !joinAttempted) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        <p className="text-gray-500">Uniéndote a la mesa...</p>
      </div>
    )
  }

  if (error && !mesa && !needsCode) {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-4">
        <p className="text-red-500 text-lg mb-4">{error}</p>
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-black">← Volver</button>
      </div>
    )
  }

  if (needsCode && !mesa) {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-4">
        <div className="max-w-sm w-full space-y-4">
          <h2 className="text-xl font-bold text-center">Unirse a mesa</h2>
          <p className="text-gray-500 text-sm text-center">Ingresa el código de invitación de 4 dígitos</p>
          <input
            type="text" maxLength={4} placeholder="0000"
            value={codigoInput}
            onChange={e => setCodigoInput(e.target.value.replace(/\D/g, ''))}
            className="w-full p-4 rounded-md bg-gray-50 border border-gray-200 focus:border-gray-400 outline-none text-center font-mono text-2xl tracking-widest"
          />
          <button
            onClick={() => join(codigoInput)}
            disabled={codigoInput.length !== 4}
            className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400 p-3 rounded-md font-semibold transition text-white"
          >
            Unirse
          </button>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        </div>
      </div>
    )
  }

  if (cuentaCerrada) {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-4 text-center space-y-4">
        <p className="text-2xl">🧾</p>
        <h2 className="text-xl font-bold">Cuenta cerrada</h2>
        <p className="text-gray-500">Gracias por tu visita. Serás redirigido en unos segundos.</p>
        <button onClick={() => { localStorage.clear(); navigate('/') }} className="bg-black text-white px-6 py-2 rounded-md text-sm">
          Salir ahora
        </button>
      </div>
    )
  }

  if (!mesa) return null

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-md mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Hola, {usuarioNombre}</p>
            <h1 className="text-3xl font-bold">Mesa {mesa.numero}</h1>
            <p className="text-gray-500 text-sm">{MESA_ESTADO_LABEL[mesa.estado] || mesa.estado}</p>
          </div>
          {mesa.estado === 'libre' && (
            <button
              onClick={() => { localStorage.clear(); navigate('/login') }}
              className="text-sm text-gray-400 hover:text-black"
            >
              Cerrar sesión
            </button>
          )}
        </div>

        {codigoInvitacion && (
          <div className="bg-gray-900 text-white rounded-md p-5 text-center">
            <p className="text-gray-400 text-xs mb-1">Código de invitación</p>
            <p className="text-5xl font-mono font-bold tracking-[0.3em]">{codigoInvitacion}</p>
            <p className="text-gray-400 text-xs mt-2">Comparte este código con los demás comensales</p>
          </div>
        )}

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">En la mesa</h2>
          {comensales.length === 0 && <p className="text-gray-400 text-sm">Esperando comensales...</p>}
          <div className="flex flex-wrap gap-2">
            {comensales.map(c => (
              <div key={c.usuario_id} className="bg-gray-50 border border-gray-200 rounded-full px-4 py-2 flex items-center gap-2 text-sm">
                <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {c.nombre[0]}
                </div>
                <span className={c.usuario_id === usuarioId ? 'font-semibold' : ''}>
                  {c.nombre}{c.usuario_id === usuarioId ? ' (tú)' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 pt-4">
          {tienePedido && (
            <button
              onClick={() => setShowPedidoActivo(true)}
              className="w-full bg-white border border-black hover:bg-gray-50 py-3 rounded-md font-semibold transition text-black max-w-sm"
            >
              Ver mi pedido
            </button>
          )}
          <button
            onClick={() => setShowMenu(true)}
            className="w-full bg-black hover:bg-gray-800 py-3 rounded-md font-semibold transition text-white max-w-sm"
          >
            Ver menú
          </button>
          <button
            onClick={() => { setShowLlamar(true); setLlamarExito(false); setLlamarMensaje('') }}
            className="w-full bg-white border border-gray-300 hover:bg-gray-50 py-3 rounded-md font-semibold transition text-gray-600 max-w-sm text-sm"
          >
            Llamar mesero
          </button>
        </div>

        {showLlamar && (
          <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-sm p-5 space-y-4">
              <h3 className="font-bold text-lg">Llamar mesero</h3>
              {llamarExito ? (
                <div className="text-center space-y-3 py-4">
                  <p className="text-green-600 font-medium">¡Aviso enviado!</p>
                  <p className="text-gray-500 text-sm">El mesero irá a la mesa en un momento</p>
                  <button
                    onClick={() => setShowLlamar(false)}
                    className="w-full bg-black hover:bg-gray-800 text-white py-2 rounded-md text-sm"
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 flex-wrap">
                    {['Cuenta por favor', 'Más servilletas', 'Más limones', 'Salsa extra', 'Ayuda'].map(p => (
                      <button
                        key={p}
                        onClick={() => setLlamarMensaje(p)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition ${
                          llamarMensaje === p
                            ? 'bg-black text-white border-black'
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <textarea
                    placeholder="O escribe tu mensaje..."
                    value={llamarMensaje}
                    onChange={e => setLlamarMensaje(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-200 rounded-md p-3 text-sm outline-none focus:border-gray-400 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowLlamar(false)}
                      className="flex-1 border border-gray-200 text-gray-500 py-2 rounded-md text-sm hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={async () => {
                        if (!llamarMensaje.trim()) return
                        setLlamarEnviando(true)
                        try {
                          await api('/api/llamados/mesa/' + mesaId, {
                            method: 'POST',
                            body: JSON.stringify({ tipo: 'mensaje', mensaje: llamarMensaje.trim(), restaurante_id: Number(restauranteId) }),
                          })
                          setLlamarExito(true)
                        } catch (e: any) {
                          setError(e.message || 'Error al enviar')
                        } finally {
                          setLlamarEnviando(false)
                        }
                      }}
                      disabled={!llamarMensaje.trim() || llamarEnviando}
                      className="flex-1 bg-black hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400 text-white py-2 rounded-md text-sm"
                    >
                      {llamarEnviando ? 'Enviando...' : 'Enviar'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {showMenu && (
          <div className="fixed inset-0 z-40 bg-white overflow-y-auto">
            <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-100 sticky top-0 bg-white z-10">
              <span className="font-bold text-lg">Menú</span>
              <button onClick={() => setShowMenu(false)} className="text-gray-400 hover:text-black text-xl leading-none">✕</button>
            </div>
            <MenuDigital
              restauranteId={restauranteId!}
              usuarioId={usuarioId}
              usuarioNombre={usuarioNombre}
              onClose={() => setShowMenu(false)}
              onCartClick={() => { setShowMenu(false); setShowPrePedido(true) }}
            />
          </div>
        )}

        {showPrePedido && (
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowPrePedido(false)}>
            <div className="absolute bottom-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
                <span className="font-bold text-lg">Pre-pedido</span>
                <button onClick={() => setShowPrePedido(false)} className="text-gray-400 hover:text-black text-xl leading-none">✕</button>
              </div>
              <div className="p-4">
                <PrePedido
                  restauranteId={restauranteId}
                  mesaId={mesaId}
                  onClose={() => setShowPrePedido(false)}
                  onSuccess={() => { setShowPrePedido(false); setShowPedidoActivo(true) }}
                />
              </div>
            </div>
          </div>
        )}

        {showPedidoActivo && (
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowPedidoActivo(false)}>
            <div className="absolute bottom-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
                <span className="font-bold text-lg">Mi pedido</span>
                <button onClick={() => setShowPedidoActivo(false)} className="text-gray-400 hover:text-black text-xl leading-none">✕</button>
              </div>
              <div className="p-4">
                <PedidoActivo
                  restauranteId={restauranteId}
                  mesaId={mesaId}
                  onClose={() => setShowPedidoActivo(false)}
                  onSumarMas={() => { setShowPedidoActivo(false); setShowMenu(true) }}
                />
              </div>
            </div>
          </div>
        )}

        {cartCount > 0 && !showMenu && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white pointer-events-none">
          <button
            onClick={() => setShowPrePedido(true)}
              className="pointer-events-auto w-full bg-black hover:bg-gray-800 text-white py-3 rounded-md font-semibold flex items-center justify-center gap-2 transition"
            >
              <span>Ver pedido</span>
              <span className="bg-white text-black text-xs font-bold px-2 py-0.5 rounded-full">{cartCount}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Mesa() {
  return (
    <CartProvider>
      <MesaInner />
    </CartProvider>
  )
}


