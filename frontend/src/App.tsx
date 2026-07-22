import { Routes, Route, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  const [mode, setMode] = useState<'login' | 'register'>('login')
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
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ celular, password }),
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

      navigate(redirectPorRol(data.usuario.rol), { replace: true })
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
    <div className="min-h-screen bg-[#f5f5f0] text-[#111] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 59px, #000 59px, #000 60px),
                            repeating-linear-gradient(90deg, transparent, transparent 59px, #000 59px, #000 60px)`
        }}
      />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-[#111] mb-1">miResto</h1>
          <p className="text-sm text-[#888] tracking-[0.2em] uppercase">Menú digital para tu restaurante</p>
        </div>

        <Card className="w-full shadow-md border border-[#e5e5e0]">
          <div className="flex border-b border-[#e5e5e0]">
            <button
              onClick={() => switchMode()}
              className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                mode === 'login'
                  ? 'text-[#111]'
                  : 'text-[#bbb] hover:text-[#888]'
              }`}
            >
              Iniciar sesión
              {mode === 'login' && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#111]" />
              )}
            </button>
            <button
              onClick={() => switchMode()}
              className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                mode === 'register'
                  ? 'text-[#111]'
                  : 'text-[#bbb] hover:text-[#888]'
              }`}
            >
              Crear cuenta
              {mode === 'register' && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#111]" />
              )}
            </button>
          </div>

          <CardContent className="pt-6 pb-5 space-y-5">
            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <label className="text-xs text-[#888] font-medium">Celular</label>
                <Input
                  type="tel"
                  placeholder="55 1234 5678"
                  value={celular}
                  onChange={e => setCelular(e.target.value)}
                  className="h-10 text-sm bg-white border-[#e5e5e0]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[#888] font-medium">Contraseña</label>
                <Input
                  type="password"
                  placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="h-10 text-sm bg-white border-[#e5e5e0]"
                />
              </div>
              {error && (
                <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 text-sm bg-[#111] hover:bg-[#000] text-white"
              >
                {loading
                  ? (mode === 'login' ? 'Entrando…' : 'Creando cuenta…')
                  : (mode === 'login' ? 'Entrar' : 'Crear cuenta')
                }
              </Button>
            </form>

            {mode === 'login' && (
              <p className="text-xs text-[#aaa] text-center">
                ¿No tienes cuenta?{' '}
                <button onClick={switchMode} className="text-[#111] underline underline-offset-2 hover:no-underline font-medium">
                  Crear una
                </button>
              </p>
            )}
          </CardContent>
        </Card>

        {mode === 'register' && (
          <p className="text-xs text-[#aaa] text-center max-w-xs leading-relaxed">
            Al crear una cuenta aceptas nuestros{' '}
            <a href="#" className="text-[#111] underline underline-offset-2 hover:no-underline">Términos</a>
            {' '}y{' '}
            <a href="#" className="text-[#111] underline underline-offset-2 hover:no-underline">Política de privacidad</a>
          </p>
        )}
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
