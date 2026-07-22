import { Routes, Route, Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

function Home() {
  const navigate = useNavigate()
  const token = localStorage.getItem('accessToken')

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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
      {token && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { localStorage.clear(); navigate('/login') }}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          Cerrar sesión
        </Button>
      )}
      <h1 className="text-5xl font-bold mb-2">miResto</h1>
      <p className="text-muted-foreground text-lg mb-8">Menú digital para tu restaurante</p>
      {!token ? (
        <div className="flex flex-col items-center gap-4">
          <Link to="/login">
            <Button className="px-8 py-6 text-lg bg-black hover:bg-gray-800 text-white">Iniciar sesión</Button>
          </Link>
          <span className="text-muted-foreground text-sm">o</span>
          <QRScanner />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <Link to="/m/1/1">
            <Button className="px-8 py-6 text-lg bg-black hover:bg-gray-800 text-white">Mesa demo</Button>
          </Link>
          <span className="text-muted-foreground text-sm">o</span>
          <QRScanner />
        </div>
      )}
    </div>
  )
}

function Login() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const redirect = searchParams.get('redirect')

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [celular, setCelular] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ celular, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión')
        return
      }
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      localStorage.setItem('user', JSON.stringify(data.usuario))

      if (data.usuario.force_password_change) {
        navigate('/cambiar-contrasena', { replace: true })
        return
      }

      if (redirect) {
        window.location.href = redirect
      } else {
        const destino = redirectPorRol(data.usuario.rol)
        navigate(destino, { replace: true })
      }
    } catch {
      setError('Error de conexión')
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ celular, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al registrarse')
        return
      }
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      localStorage.setItem('user', JSON.stringify(data.usuario))

      if (redirect) {
        window.location.href = redirect
      } else {
        navigate('/', { replace: true })
      }
    } catch {
      setError('Error de conexión')
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={mode === 'login' ? handleLogin : handleRegister}>
            <Input type="tel" placeholder="Celular" value={celular} onChange={e => setCelular(e.target.value)} />
            <Input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full bg-black hover:bg-gray-800 text-white">
              {mode === 'login' ? 'Entrar' : 'Registrarse'}
            </Button>
          </form>
          <Separator className="my-4" />
          <div className="flex justify-between items-center">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Volver</Link>
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
              className="text-sm text-foreground underline underline-offset-4 hover:no-underline"
            >
              {mode === 'login' ? 'Crear cuenta' : 'Iniciar sesión'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
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
