import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { QrCode, User } from 'lucide-react'
import { api, clearAppData } from './services/api'
import Mesa from './routes/Mesa'
import Cocina from './routes/Cocina'
import AdminLayout from './routes/AdminLayout'
import AdminDashboard from './routes/admin/Dashboard'
import AdminMenu from './routes/admin/Menu'
import AdminMesas from './routes/admin/Mesas'
import AdminStaff from './routes/admin/Staff'
import AdminPedidos from './routes/admin/Pedidos'
import AdminDeposito from './routes/admin/Deposito'
import Mesero from './routes/Mesero'
import Super from './routes/Super'
import ForcePasswordChange from './routes/ForcePasswordChange'
import QRScanner from './components/QRScanner'

function redirectPorRol(rol: string) {
  const map: Record<string, string> = {
    super_admin: '/super/restaurantes',
    admin: '/admin',
    mesero: '/dashboard',
    cocina: '/cocina',
    comensal: '/',
  }
  return map[rol] || '/'
}

function Home() {
  const navigate = useNavigate()
  const userStr = localStorage.getItem('user')
  let user: any = null
  try { user = userStr ? JSON.parse(userStr) : null } catch {}
  const [perfilOpen, setPerfilOpen] = useState(false)
  const [editNombre, setEditNombre] = useState(user?.nombre || '')
  const [editFecha, setEditFecha] = useState(user?.fecha_nacimiento || '')
  const [passwordActual, setPasswordActual] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [perfilMsg, setPerfilMsg] = useState('')
  const [perfilError, setPerfilError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) { navigate('/login', { replace: true }); return }
    const rid = localStorage.getItem('lastMesa_restauranteId')
    const mid = localStorage.getItem('lastMesa_mesaId')
    if (!rid || !mid) return
    api('/api/mesas/' + mid + '?restaurante_id=' + rid).then((d: any) => {
      if (d.comensales?.some((c: any) => c.usuario_id === user?.id)) {
        navigate('/m/' + rid + '/' + mid, { replace: true })
        return
      }
      localStorage.removeItem('lastMesa_restauranteId')
      localStorage.removeItem('lastMesa_mesaId')
    }).catch(() => {
      localStorage.removeItem('lastMesa_restauranteId')
      localStorage.removeItem('lastMesa_mesaId')
    })
  }, [])

  async function guardarPerfil() {
    setPerfilMsg('')
    setPerfilError('')
    const body: Record<string, string> = {}
    if (editNombre !== user?.nombre) body.nombre = editNombre
    if (editFecha !== (user?.fecha_nacimiento || '')) body.fecha_nacimiento = editFecha || null as any
    if (newPassword) {
      body.password = passwordActual
      body.newPassword = newPassword
    }
    if (Object.keys(body).length === 0) return
    try {
      const res = await fetch('/api/auth/perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setPerfilError(data.error || 'Error al guardar')
        return
      }
      localStorage.setItem('user', JSON.stringify(data.usuario))
      setEditNombre(data.usuario.nombre)
      setEditFecha(data.usuario.fecha_nacimiento || '')
      setPasswordActual('')
      setNewPassword('')
      setPerfilMsg('Perfil actualizado')
    } catch {
      setPerfilError('Error de conexión')
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#f0e8de_0%,_transparent_70%)]" />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* header con logo */}
        <div className="w-full border-b border-border bg-white/80 backdrop-blur-sm">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-center">
            <h1 className="text-lg font-light tracking-tight">miResto</h1>
          </div>
        </div>

        {/* contenido */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 pb-24">
          <div className="w-full max-w-sm flex flex-col items-center gap-6">
            <div className="text-center">
              <p className="text-xs text-muted-foreground tracking-[0.2em] uppercase">Menú digital para tu restaurante</p>
            </div>
            <Card className="w-full shadow-md border border-border">
              <CardContent className="pt-8 pb-8 flex flex-col items-center gap-6">
                <p className="text-sm text-muted-foreground text-center">Escanea el código QR de tu mesa</p>
                <div className="flex justify-center w-full">
                  <QRScanner />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-white/90 backdrop-blur-sm z-20">
        <div className="max-w-lg mx-auto flex">
          <Button variant="ghost" size="sm" className="flex-1 flex flex-col items-center gap-0.5 py-2.5 h-auto text-foreground rounded-none">
            <QrCode className="w-5 h-5" />
            <span className="text-[10px] font-medium">Inicio</span>
          </Button>
          <Button
            variant="ghost" size="sm"
            onClick={() => setPerfilOpen(true)}
            className="flex-1 flex flex-col items-center gap-0.5 py-2.5 h-auto text-muted-foreground hover:text-foreground rounded-none"
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-medium">Perfil</span>
          </Button>
        </div>
      </div>

      {/* sheet de perfil */}
      <Sheet open={perfilOpen} onOpenChange={setPerfilOpen}>
        <SheetContent side="left" className="bg-background border-r border-border p-0">
          <div className="h-full flex flex-col">
            <div className="px-5 pt-6 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-medium shrink-0">
                  {(user?.nombre || '?')[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-base font-medium">{user?.nombre || 'Comensal'}</p>
                  <p className="text-xs text-muted-foreground">{user?.celular || ''}</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Nombre</label>
                <Input
                  value={editNombre}
                  onChange={e => setEditNombre(e.target.value)}
                  className="h-10 text-sm bg-white border-border"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Fecha de nacimiento</label>
                <Input
                  type="date"
                  value={editFecha}
                  onChange={e => setEditFecha(e.target.value)}
                  className="h-10 text-sm bg-white border-border"
                />
              </div>
              <Separator className="bg-border" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cambiar contraseña</p>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Contraseña actual</label>
                <Input
                  type="password"
                  value={passwordActual}
                  onChange={e => setPasswordActual(e.target.value)}
                  className="h-10 text-sm bg-white border-border"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Nueva contraseña</label>
                <Input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="h-10 text-sm bg-white border-border"
                />
              </div>
              {perfilMsg && <p className="text-green-600 text-xs bg-green-50 border border-green-100 rounded-md px-3 py-2">{perfilMsg}</p>}
              {perfilError && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-md px-3 py-2">{perfilError}</p>}
              <Button
                onClick={guardarPerfil}
                className="w-full h-11 text-sm"
              >
                Guardar cambios
              </Button>
            </div>
            <div className="px-5 py-4 border-t border-border">
              <Button
                variant="outline"
                onClick={() => { clearAppData(); navigate('/login') }}
                className="w-full h-10 text-sm border-border text-muted-foreground hover:text-red-500 hover:border-red-200"
              >
                Cerrar sesión
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function AuthScreen() {
  const navigate = useNavigate()
  const token = localStorage.getItem('accessToken')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [nombre, setNombre] = useState('')
  const [celular, setCelular] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) return
    const userStr = localStorage.getItem('user')
    if (!userStr) return
    try {
      const user = JSON.parse(userStr)
      const redirect = new URLSearchParams(window.location.search).get('redirect')
      if (redirect && redirect.startsWith('/')) { navigate(redirect, { replace: true }); return }
      if (user.rol && user.rol !== 'comensal') {
        navigate(redirectPorRol(user.rol), { replace: true })
      }
    } catch {}
  }, [token, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
    const body: Record<string, string> = { celular, password }
    if (mode === 'register') body.nombre = nombre
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || (mode === 'login' ? 'Celular o contraseña incorrectos' : 'No se pudo crear la cuenta'))
        return
      }
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      localStorage.setItem('user', JSON.stringify(data.usuario))

      if (data.usuario.force_password_change) {
        navigate('/cambiar-contrasena', { replace: true })
        return
      }

      const redirectAfterLogin = new URLSearchParams(window.location.search).get('redirect')
      if (redirectAfterLogin && redirectAfterLogin.startsWith('/')) {
        navigate(redirectAfterLogin, { replace: true })
      } else {
        navigate(redirectPorRol(data.usuario.rol), { replace: true })
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  function switchMode() {
    setMode(mode === 'login' ? 'register' : 'login')
    setError('')
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#f0e8de_0%,_transparent_70%)]" />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-foreground mb-1">miResto</h1>
          <p className="text-sm text-muted-foreground tracking-[0.2em] uppercase">Menú digital para tu restaurante</p>
        </div>

        <Card className="w-full shadow-md border border-border">
          <div className="flex border-b border-border">
            <button
              onClick={() => switchMode()}
              className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                mode === 'login'
                  ? 'text-foreground'
                  : 'text-muted-foreground/60 hover:text-muted-foreground'
              }`}
            >
              Iniciar sesión
              {mode === 'login' && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => switchMode()}
              className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                mode === 'register'
                  ? 'text-foreground'
                  : 'text-muted-foreground/60 hover:text-muted-foreground'
              }`}
            >
              Crear cuenta
              {mode === 'register' && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary" />
              )}
            </button>
          </div>

          <CardContent className="pt-6 pb-5 space-y-5">
            <form className="space-y-3" onSubmit={handleSubmit}>
              {mode === 'register' && (
                <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Nombre</label>
                  <Input
                    type="text"
                    placeholder="Tu nombre"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    className="h-10 text-sm bg-white border-border"
                  />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Celular</label>
                <Input
                  type="tel"
                  placeholder="55 1234 5678"
                  value={celular}
                  onChange={e => setCelular(e.target.value)}
                  className="h-10 text-sm bg-white border-border"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Contraseña</label>
                <Input
                  type="password"
                  placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="h-10 text-sm bg-white border-border"
                />
              </div>
              {error && (
                <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 text-sm"
              >
                {loading
                  ? (mode === 'login' ? 'Entrando…' : 'Creando cuenta…')
                  : (mode === 'login' ? 'Entrar' : 'Crear cuenta')
                }
              </Button>
            </form>

            {mode === 'login' && (
              <p className="text-xs text-muted-foreground/70 text-center">
                ¿No tienes cuenta?{' '}
                <Button variant="link" onClick={switchMode} className="text-foreground underline underline-offset-2 font-medium p-0 h-auto">
                  Crear una
                </Button>
              </p>
            )}
          </CardContent>
        </Card>

        {mode === 'register' && (
          <p className="text-xs text-muted-foreground/70 text-center max-w-xs leading-relaxed">
            Al crear una cuenta aceptas nuestros{' '}
            <a href="#" className="text-foreground underline underline-offset-2 hover:no-underline">Términos</a>
            {' '}y{' '}
            <a href="#" className="text-foreground underline underline-offset-2 hover:no-underline">Política de privacidad</a>
          </p>
        )}

        <Link to="/" className="text-xs text-muted-foreground/70 hover:text-foreground underline underline-offset-2">
          ← Ya tengo cuenta
        </Link>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<AuthScreen />} />
      <Route path="/m/:restauranteId/:mesaId" element={<Mesa />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="menu" element={<AdminMenu />} />
        <Route path="mesas" element={<AdminMesas />} />
        <Route path="pedidos" element={<AdminPedidos />} />
        <Route path="deposito" element={<AdminDeposito />} />
        <Route path="staff" element={<AdminStaff />} />
      </Route>
      <Route path="/cocina" element={<Cocina />} />
      <Route path="/super/restaurantes" element={<Super />} />
      <Route path="/dashboard" element={<Mesero />} />
      <Route path="/cambiar-contrasena" element={<ForcePasswordChange />} />
    </Routes>
  )
}
