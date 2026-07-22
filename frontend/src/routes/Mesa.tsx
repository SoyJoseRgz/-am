import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ShoppingCart, Users, X, Bell, LogOut } from 'lucide-react'
import { Input } from '../components/ui/input'
import { Separator } from '../components/ui/separator'
import { api, getCurrentUser } from '../services/api'
import { connectToMesa, leaveMesa, socket } from '../services/socket'

import { CartProvider, useCart } from '../stores/CartContext'
import MenuDigital from './MenuDigital'
import PrePedido from './PrePedido'
import PedidoActivo from './PedidoActivo'

interface MesaData { id: number; numero: number; estado: string }
interface Comensal { usuario_id: number; nombre: string; celular: string }

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
  const [tienePedido, setTienePedido] = useState(false)
  const [cuentaCerrada, setCuentaCerrada] = useState(false)
  const [showCart, setShowCart] = useState(false)
  const [showMesa, setShowMesa] = useState(false)
  const [showLlamar, setShowLlamar] = useState(false)
  const [llamarMensaje, setLlamarMensaje] = useState('')
  const [llamarEnviando, setLlamarEnviando] = useState(false)
  const [llamarExito, setLlamarExito] = useState(false)
  const { items } = useCart()

  const currentUser = getCurrentUser()
  const usuarioId = currentUser.id || 0
  const usuarioNombre = currentUser.nombre || ''
  const [showPerfil, setShowPerfil] = useState(false)
  const [editNombre, setEditNombre] = useState(usuarioNombre)
  const [editFecha, setEditFecha] = useState(currentUser.fecha_nacimiento || '')
  const [passwordActual, setPasswordActual] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [perfilMsg, setPerfilMsg] = useState('')
  const [perfilError, setPerfilError] = useState('')
  const cartCount = items.filter(i => i.usuarioId === usuarioId).reduce((s, i) => s + i.cantidad, 0)
  const cartTotal = items.filter(i => i.usuarioId === usuarioId).reduce((s, i) => s + i.precioUnitario * i.cantidad, 0)

  const join = useCallback(async (codigo?: string) => {
    const token = localStorage.getItem('accessToken')
    if (!token) { navigate(`/login?redirect=/m/${restauranteId}/${mesaId}`); return }
    setLoading(true); setError(''); setJoinAttempted(true)
    try {
      const data = await api('/api/mesas/' + mesaId + '/join', {
        method: 'POST', body: JSON.stringify({ restaurante_id: Number(restauranteId), codigo: codigo || undefined }),
      }) as any
      setMesa(data.mesa)
      if (data.codigo_invitacion) setCodigoInvitacion(data.codigo_invitacion)
      connectToMesa(Number(restauranteId), Number(mesaId))
    } catch (e: any) {
      if (e.message === 'Código de invitación requerido') { setNeedsCode(true); setLoading(false); return }
      setError(e.message || 'Error al unirse')
    } finally { setLoading(false) }
  }, [restauranteId, mesaId, navigate])

  useEffect(() => { join()
    socket.on('comensal:unido', () => { api('/api/mesas/' + mesaId + '?restaurante_id=' + restauranteId).then((d: any) => { setComensales(d.comensales || []); if (d.codigo_invitacion) setCodigoInvitacion(d.codigo_invitacion) }) })
    socket.on('pedido:creado', () => setTienePedido(true))
    socket.on('item:actualizado', () => { api<any[]>('/api/pedidos/mesa/' + mesaId).then(data => setTienePedido(Array.isArray(data) && data.length > 0)).catch(() => {}) })
    socket.on('mesa:estado', (d: any) => { if (d.mesaId === Number(mesaId)) { setMesa(prev => prev ? { ...prev, estado: d.estado } : prev); if (d.estado === 'limpiando') setCuentaCerrada(true) } })
    return () => { socket.off('comensal:unido'); socket.off('pedido:creado'); socket.off('item:actualizado'); socket.off('mesa:estado'); leaveMesa(Number(restauranteId), Number(mesaId)) }
  }, [join, mesaId, restauranteId])

  useEffect(() => {
    if (!mesa) return
    api('/api/mesas/' + mesaId + '?restaurante_id=' + restauranteId).then((d: any) => { setComensales(d.comensales || []); if (d.codigo_invitacion) setCodigoInvitacion(d.codigo_invitacion) })
    api<any[]>('/api/pedidos/mesa/' + mesaId).then(data => setTienePedido(Array.isArray(data) && data.length > 0)).catch(() => {})
  }, [mesa, mesaId, restauranteId])

  function limpiarCarrito() { Object.keys(localStorage).filter(k => k.startsWith('cart_')).forEach(k => localStorage.removeItem(k)) }

  useEffect(() => { if (cuentaCerrada) { const t = setTimeout(() => { limpiarCarrito(); navigate('/') }, 5000); return () => clearTimeout(t) } }, [cuentaCerrada, navigate])

  async function guardarPerfil() {
    setPerfilMsg(''); setPerfilError('')
    try {
      const body: Record<string, any> = { nombre: editNombre }
      if (editFecha !== (currentUser.fecha_nacimiento || '')) body.fecha_nacimiento = editFecha || null
      if (passwordActual && newPassword) { body.password_actual = passwordActual; body.new_password = newPassword }
      const data = await api<any>('/api/auth/perfil', { method: 'PUT', body: JSON.stringify(body) })
      if (data.error) { setPerfilError(data.error); return }
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)
      setEditFecha(data.usuario.fecha_nacimiento || '')
      setPasswordActual(''); setNewPassword('')
      setPerfilMsg('Perfil actualizado')
    } catch { setPerfilError('Error de conexión') }
  }

  if (loading && !joinAttempted) return <div className="min-h-screen bg-[#faf6f2] text-[#111] flex items-center justify-center"><p className="text-[#888]">Uniéndote a la mesa...</p></div>
  if (error && !mesa && !needsCode) return <div className="min-h-screen bg-[#faf6f2] text-[#111] flex flex-col items-center justify-center p-4"><p className="text-red-500 text-lg mb-4">{error}</p><button onClick={() => navigate('/')} className="text-sm text-[#888] hover:text-[#111] underline underline-offset-2">← Volver</button></div>

  if (needsCode && !mesa) {
    return <div className="min-h-screen bg-[#faf6f2] text-[#111] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4"><h2 className="text-xl font-bold text-center">Unirse a mesa</h2><p className="text-xs text-[#888] text-center">Ingresa el código de invitación de 4 dígitos</p>
        <input type="text" maxLength={4} placeholder="0000" value={codigoInput} onChange={e => setCodigoInput(e.target.value.replace(/\D/g, ''))} className="w-full p-4 rounded-md bg-white border border-[#e5ddd2] text-center font-mono text-2xl tracking-widest outline-none focus:border-[#111]" />
        <button onClick={() => join(codigoInput)} disabled={codigoInput.length !== 4} className="w-full h-11 text-sm bg-[#111] hover:bg-[#000] disabled:bg-[#e5ddd2] disabled:text-[#aaa] text-white rounded-md font-medium transition">Unirse</button>
        {error && <p className="text-red-500 text-xs text-center bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>}
      </div>
    </div>
  }

  if (cuentaCerrada) return <div className="min-h-screen bg-[#faf6f2] text-[#111] flex flex-col items-center justify-center p-4 text-center space-y-4"><h2 className="text-xl font-bold">Cuenta cerrada</h2><p className="text-xs text-[#888]">Gracias por tu visita. Serás redirigido en unos segundos.</p><button onClick={() => { limpiarCarrito(); navigate('/') }} className="h-10 px-6 text-sm bg-[#111] hover:bg-[#000] text-white rounded-md">Salir ahora</button></div>

  if (!mesa) return null

  return (
    <div className="min-h-screen bg-[#faf6f2] text-[#111] flex flex-col">
      {/* header */}
      <div className="w-full border-b border-[#e5ddd2] bg-white/80 backdrop-blur-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-medium">Mesa {mesa.numero}</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowLlamar(true)}
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium border border-[#e5ddd2] rounded-md bg-white hover:bg-[#faf6f2] text-[#111] transition-colors">
              <Bell className="w-3.5 h-3.5" /> Llamar
            </button>
            <button onClick={() => setShowMesa(true)} className="flex items-center gap-1.5 text-xs text-[#888] hover:text-[#111] transition-colors">
              <Users className="w-4 h-4" />
              {comensales.length > 0 && <span className="text-sm font-medium">{comensales.length}</span>}
            </button>
            <button onClick={() => setShowPerfil(true)}
              className="w-7 h-7 rounded-full bg-[#111] text-white flex items-center justify-center text-[11px] font-bold shrink-0 hover:opacity-80 transition-opacity">
              {usuarioNombre[0]}
            </button>
          </div>
        </div>
      </div>

      {/* menú siempre visible */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: cartCount > 0 ? '72px' : '0' }}>
        <div className="max-w-lg mx-auto">
          <MenuDigital restauranteId={restauranteId!} usuarioId={usuarioId} usuarioNombre={usuarioNombre} />
        </div>
      </div>

      {/* barra de carrito fija */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5ddd2] z-20">
          <div className="max-w-lg mx-auto">
            <button onClick={() => setShowCart(true)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#faf6f2] transition-colors">
              <div className="relative">
                <ShoppingCart className="w-5 h-5 text-[#111]" />
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#111] text-white text-[8px] font-bold flex items-center justify-center">{cartCount}</span>
              </div>
              <span className="flex-1 text-xs text-[#888]">{cartCount} item{cartCount !== 1 ? 's' : ''}</span>
              <span className="text-sm font-semibold">${cartTotal.toFixed(2)}</span>
              <span className="text-xs text-[#888]">Ver pedido →</span>
            </button>
          </div>
        </div>
      )}

      {/* sheet de carrito */}
      {showCart && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end justify-center" onClick={() => setShowCart(false)}>
          <div className="bg-[#faf6f2] w-full max-w-lg rounded-t-xl max-h-[85vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[#faf6f2] border-b border-[#e5ddd2] px-4 py-3 flex items-center justify-between z-10">
              <span className="font-semibold text-sm">{tienePedido ? 'Mi pedido' : 'Pre-pedido'}</span>
              <button onClick={() => setShowCart(false)} className="w-7 h-7 rounded-full bg-white border border-[#e5ddd2] flex items-center justify-center text-sm hover:bg-[#faf6f2] transition-colors"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="p-4">
              {tienePedido ? (
                <PedidoActivo restauranteId={restauranteId} mesaId={mesaId} onClose={() => setShowCart(false)} onSumarMas={() => setShowCart(false)} />
              ) : (
                <PrePedido restauranteId={restauranteId} mesaId={mesaId} onClose={() => setShowCart(false)} onSuccess={() => { setTienePedido(true); setShowCart(false) }} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* sheet de mesa (info, comensales, llamar) */}
      {showMesa && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end justify-center" onClick={() => setShowMesa(false)}>
          <div className="bg-[#faf6f2] w-full max-w-lg rounded-t-xl max-h-[80vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[#faf6f2] border-b border-[#e5ddd2] px-4 py-3 flex items-center justify-between z-10">
              <span className="font-semibold text-sm">Mesa {mesa.numero}</span>
              <button onClick={() => setShowMesa(false)} className="w-7 h-7 rounded-full bg-white border border-[#e5ddd2] flex items-center justify-center text-sm hover:bg-[#faf6f2] transition-colors"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="p-4 space-y-5">
              {codigoInvitacion && (
                <div className="bg-[#111] text-white rounded-md p-5 text-center">
                  <p className="text-[#888] text-xs mb-1">Código de invitación</p>
                  <p className="text-5xl font-mono font-bold tracking-[0.3em]">{codigoInvitacion}</p>
                  <p className="text-[#888] text-xs mt-2">Comparte con los demás comensales</p>
                </div>
              )}
              <div className="space-y-2">
                <h2 className="text-xs font-medium text-[#888] uppercase tracking-wider">En la mesa</h2>
                {comensales.length === 0 && <p className="text-xs text-[#aaa]">Esperando comensales...</p>}
                <div className="flex flex-wrap gap-2">
                  {comensales.map(c => (
                    <div key={c.usuario_id} className="bg-white border border-[#e5ddd2] rounded-full px-4 py-2 flex items-center gap-2 text-sm">
                      <div className="w-7 h-7 rounded-full bg-[#111] text-white flex items-center justify-center text-xs font-bold shrink-0">{c.nombre[0]}</div>
                      <span className={c.usuario_id === usuarioId ? 'font-medium' : 'text-[#888]'}>{c.nombre}{c.usuario_id === usuarioId ? ' (tú)' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => { setShowMesa(false); setShowLlamar(true) }}
                className="w-full h-11 text-sm border border-[#e5ddd2] bg-white hover:bg-[#faf6f2] text-[#888] hover:text-[#111] rounded-md font-medium transition">
                Llamar mesero
              </button>
            </div>
          </div>
        </div>
      )}

      {/* modal llamar mesero */}
      {showLlamar && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center p-4" onClick={() => setShowLlamar(false)}>
          <div className="bg-white rounded-xl w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg">Llamar mesero</h3>
            {llamarExito ? (
              <div className="text-center space-y-3 py-4">
                <p className="text-green-600 font-medium">¡Aviso enviado!</p>
                <p className="text-xs text-[#888]">El mesero irá a la mesa en un momento</p>
                <button onClick={() => setShowLlamar(false)} className="w-full h-10 text-sm bg-[#111] hover:bg-[#000] text-white rounded-md">Cerrar</button>
              </div>
            ) : (
              <>
                <div className="flex gap-2 flex-wrap">
                  {['Cuenta por favor', 'Más servilletas', 'Más limones', 'Salsa extra', 'Ayuda'].map(p => (
                    <button key={p} onClick={() => setLlamarMensaje(p)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition ${llamarMensaje === p ? 'bg-[#111] text-white border-[#111]' : 'bg-white text-[#888] border-[#e5ddd2] hover:border-[#888]'}`}>{p}</button>
                  ))}
                </div>
                <textarea placeholder="O escribe tu mensaje..." value={llamarMensaje} onChange={e => setLlamarMensaje(e.target.value)} rows={3}
                  className="w-full border border-[#e5ddd2] rounded-md p-3 text-sm outline-none focus:border-[#888] resize-none bg-white" />
                <div className="flex gap-2">
                  <button onClick={() => setShowLlamar(false)} className="flex-1 h-10 text-sm border border-[#e5ddd2] text-[#888] rounded-md hover:bg-[#faf6f2]">Cancelar</button>
                  <button onClick={async () => {
                    if (!llamarMensaje.trim()) return; setLlamarEnviando(true)
                    try { await api('/api/llamados/mesa/' + mesaId, { method: 'POST', body: JSON.stringify({ tipo: 'mensaje', mensaje: llamarMensaje.trim(), restaurante_id: Number(restauranteId) }) }); setLlamarExito(true) } catch (e: any) { setError(e.message || 'Error') } finally { setLlamarEnviando(false) }
                  }} disabled={!llamarMensaje.trim() || llamarEnviando}
                    className="flex-1 h-10 text-sm bg-[#111] hover:bg-[#000] disabled:bg-[#e5ddd2] disabled:text-[#aaa] text-white rounded-md">{llamarEnviando ? 'Enviando...' : 'Enviar'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* sheet de perfil */}
      {showPerfil && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end justify-center" onClick={() => setShowPerfil(false)}>
          <div className="bg-[#faf6f2] w-full max-w-lg rounded-t-xl max-h-[85vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[#faf6f2] border-b border-[#e5ddd2] px-4 py-3 flex items-center justify-between z-10">
              <span className="font-semibold text-sm">Mi perfil</span>
              <button onClick={() => setShowPerfil(false)} className="w-7 h-7 rounded-full bg-white border border-[#e5ddd2] flex items-center justify-center text-sm hover:bg-[#faf6f2] transition-colors"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="p-5 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-[#e5ddd2]">
                <div className="w-12 h-12 rounded-full bg-[#111] text-white flex items-center justify-center text-lg font-medium shrink-0">
                  {usuarioNombre[0]}
                </div>
                <div>
                  <p className="text-base font-medium">{usuarioNombre}</p>
                  <p className="text-xs text-[#888]">{currentUser.celular || ''}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-[#888] font-medium">Nombre</label>
                <Input value={editNombre} onChange={e => setEditNombre(e.target.value)}
                  className="h-10 text-sm bg-white border-[#e5ddd2]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-[#888] font-medium">Fecha de nacimiento</label>
                <Input type="date" value={editFecha} onChange={e => setEditFecha(e.target.value)}
                  className="h-10 text-sm bg-white border-[#e5ddd2]" />
              </div>
              <Separator className="bg-[#e5ddd2]" />
              <p className="text-xs font-medium text-[#888] uppercase tracking-wider">Cambiar contraseña</p>
              <div className="space-y-1.5">
                <label className="text-xs text-[#888] font-medium">Contraseña actual</label>
                <Input type="password" value={passwordActual} onChange={e => setPasswordActual(e.target.value)}
                  className="h-10 text-sm bg-white border-[#e5ddd2]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-[#888] font-medium">Nueva contraseña</label>
                <Input type="password" placeholder="Mínimo 6 caracteres" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  className="h-10 text-sm bg-white border-[#e5ddd2]" />
              </div>
              {perfilMsg && <p className="text-green-600 text-xs bg-green-50 border border-green-100 rounded-md px-3 py-2">{perfilMsg}</p>}
              {perfilError && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-md px-3 py-2">{perfilError}</p>}
              <button onClick={guardarPerfil}
                className="w-full h-11 text-sm bg-[#111] hover:bg-[#000] text-white rounded-md font-medium">
                Guardar cambios
              </button>
              <button onClick={() => { localStorage.clear(); navigate('/login') }}
                className="w-full h-10 text-sm border border-[#e5ddd2] text-[#888] hover:text-red-500 hover:border-red-200 rounded-md flex items-center justify-center gap-2 transition">
                <LogOut className="w-3.5 h-3.5" /> Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Mesa() {
  return <CartProvider><MesaInner /></CartProvider>
}
