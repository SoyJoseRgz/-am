import { Routes, Route, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import Mesa from './routes/Mesa'
import Cocina from './routes/Cocina'
import AdminLayout from './routes/AdminLayout'
import AdminDashboard from './routes/admin/Dashboard'
import AdminMenu from './routes/admin/Menu'
import AdminMesas from './routes/admin/Mesas'
import AdminStaff from './routes/admin/Staff'
import AdminPedidos from './routes/admin/Pedidos'
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

function AuthScreen() {
  const navigate = useNavigate()
  const token = localStorage.getItem('accessToken')
  const loginCelularRef = useRef<HTMLInputElement>(null)
  const registerCelularRef = useRef<HTMLInputElement>(null)

  const [loginCelular, setLoginCelular] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [registerCelular, setRegisterCelular] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerError, setRegisterError] = useState('')
  const [registerLoading, setRegisterLoading] = useState(false)

  useEffect(() => {
    if (!token) return
    const userStr = localStorage.getItem('user')
    if (!userStr) return
    try {
      const user = JSON.parse(userStr)
      if (user.rol && user.rol !== 'comensal') {
        navigate(redirectPorRol(user.rol), { replace: true })
      }
    } catch {}
  }, [token, navigate])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ celular: loginCelular, password: loginPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setLoginError(data.error || 'Celular o contraseña incorrectos')
        return
      }
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      localStorage.setItem('user', JSON.stringify(data.usuario))

      if (data.usuario.force_password_change) {
        navigate('/cambiar-contrasena', { replace: true })
        return
      }

      const destino = redirectPorRol(data.usuario.rol)
      navigate(destino, { replace: true })
    } catch {
      setLoginError('Error de conexión')
    } finally {
      setLoginLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setRegisterError('')
    setRegisterLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ celular: registerCelular, password: registerPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setRegisterError(data.error || 'No se pudo crear la cuenta')
        return
      }
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      localStorage.setItem('user', JSON.stringify(data.usuario))

      const destino = redirectPorRol(data.usuario.rol)
      navigate(destino, { replace: true })
    } catch {
      setRegisterError('Error de conexión')
    } finally {
      setRegisterLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#111] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* textura de mantel a cuadros */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 59px, #000 59px, #000 60px),
                            repeating-linear-gradient(90deg, transparent, transparent 59px, #000 59px, #000 60px)`
        }}
      />

      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-[#111] mb-1">miResto</h1>
          <p className="text-sm text-[#888] tracking-[0.2em] uppercase">Menú digital para tu restaurante</p>
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-6">
          {/* Card de Login — mas compacta, 2/5 en desktop */}
          <Card className="md:col-span-2 shadow-sm border border-[#e5e5e0]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Iniciar sesión</CardTitle>
              <CardDescription className="text-xs">¿Ya tienes cuenta?</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={handleLogin}>
                <div className="space-y-1">
                  <label className="text-xs text-[#888] font-medium">Celular</label>
                  <Input
                    ref={loginCelularRef}
                    type="tel"
                    placeholder="55 1234 5678"
                    value={loginCelular}
                    onChange={e => setLoginCelular(e.target.value)}
                    className="h-9 text-sm bg-white border-[#e5e5e0]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[#888] font-medium">Contraseña</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="h-9 text-sm bg-white border-[#e5e5e0]"
                  />
                </div>
                {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
                <Button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full h-9 text-sm bg-[#111] hover:bg-[#000] text-white"
                >
                  {loginLoading ? 'Entrando…' : 'Entrar'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Card de Crear cuenta — mas prominente, 3/5 en desktop */}
          <Card className="md:col-span-3 shadow-md border border-[#111] bg-white relative">
            <div className="absolute -top-2.5 right-4 bg-[#111] text-white text-[10px] font-medium px-2 py-0.5 rounded-sm uppercase tracking-wider">
              Nuevo
            </div>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Crear cuenta</CardTitle>
              <CardDescription className="text-xs">Escanea el QR del restaurante y pide desde tu celular</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="space-y-3" onSubmit={handleRegister}>
                <div className="space-y-1">
                  <label className="text-xs text-[#888] font-medium">Celular</label>
                  <Input
                    ref={registerCelularRef}
                    type="tel"
                    placeholder="55 1234 5678"
                    value={registerCelular}
                    onChange={e => setRegisterCelular(e.target.value)}
                    className="h-9 text-sm bg-white border-[#e5e5e0]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[#888] font-medium">Contraseña</label>
                  <Input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={registerPassword}
                    onChange={e => setRegisterPassword(e.target.value)}
                    className="h-9 text-sm bg-white border-[#e5e5e0]"
                  />
                </div>
                {registerError && <p className="text-red-500 text-xs">{registerError}</p>}
                <Button
                  type="submit"
                  disabled={registerLoading}
                  className="w-full h-10 text-sm bg-[#111] hover:bg-[#000] text-white"
                >
                  {registerLoading ? 'Creando cuenta…' : 'Crear cuenta y entrar'}
                </Button>
              </form>

              <Separator className="bg-[#e5e5e0]" />

              <div className="text-center">
                <p className="text-xs text-[#888] mb-3">O escanea el código QR del restaurante</p>
                <QRScanner />
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-[#aaa] text-center max-w-xs leading-relaxed">
          Al crear una cuenta aceptas nuestros{' '}
          <a href="#" className="text-[#111] underline underline-offset-2 hover:no-underline">Términos</a>
          {' '}y{' '}
          <a href="#" className="text-[#111] underline underline-offset-2 hover:no-underline">Política de privacidad</a>
        </p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthScreen />} />
      <Route path="/login" element={<AuthScreen />} />
      <Route path="/m/:restauranteId/:mesaId" element={<Mesa />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="menu" element={<AdminMenu />} />
        <Route path="mesas" element={<AdminMesas />} />
        <Route path="pedidos" element={<AdminPedidos />} />
        <Route path="staff" element={<AdminStaff />} />
      </Route>
      <Route path="/cocina" element={<Cocina />} />
      <Route path="/super/restaurantes" element={<Super />} />
      <Route path="/dashboard" element={<Mesero />} />
      <Route path="/cambiar-contrasena" element={<ForcePasswordChange />} />
    </Routes>
  )
}
