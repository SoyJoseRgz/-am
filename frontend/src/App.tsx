import { Routes, Route, Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
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
    <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-4">
      {token && (
        <button
          onClick={() => { localStorage.clear(); navigate('/login') }}
          className="absolute top-4 right-4 text-sm text-gray-400 hover:text-black"
        >
          Cerrar sesión
        </button>
      )}
      <h1 className="text-5xl font-bold mb-2">miResto</h1>
      <p className="text-gray-500 text-lg mb-8">Menú digital para tu restaurante</p>
      {!token ? (
        <div className="flex flex-col items-center gap-4">
          <Link to="/login" className="bg-black hover:bg-gray-800 px-8 py-3 rounded-md font-semibold transition text-lg text-white">
            Iniciar sesión
          </Link>
          <span className="text-gray-300 text-sm">o</span>
          <QRScanner />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <Link to="/m/1/1" className="bg-black hover:bg-gray-800 px-8 py-3 rounded-md font-semibold transition text-lg text-white">
            Mesa demo
          </Link>
          <span className="text-gray-300 text-sm">o</span>
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
    <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-4">
      {mode === 'login' ? (
        <>
          <h2 className="text-2xl font-bold mb-6">Iniciar sesión</h2>
          <form className="w-full max-w-sm space-y-4" onSubmit={handleLogin}>
            <input type="tel" placeholder="Celular" value={celular} onChange={e => setCelular(e.target.value)}
              className="w-full p-3 rounded-md bg-gray-50 border border-gray-200 focus:border-gray-400 outline-none" />
            <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full p-3 rounded-md bg-gray-50 border border-gray-200 focus:border-gray-400 outline-none" />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button className="w-full bg-black hover:bg-gray-800 p-3 rounded-md font-semibold transition text-white">Entrar</button>
          </form>
          <p className="text-gray-400 text-sm mt-4">
            ¿No tienes cuenta?{' '}
            <button onClick={() => { setMode('register'); setError('') }} className="text-black underline hover:no-underline">Crear cuenta</button>
          </p>
          <Link to="/" className="text-gray-400 text-sm mt-2 hover:text-black">← Volver</Link>
        </>
      ) : (
        <>
          <h2 className="text-2xl font-bold mb-6">Crear cuenta</h2>
          <form className="w-full max-w-sm space-y-4" onSubmit={handleRegister}>
            <input type="tel" placeholder="Celular" value={celular} onChange={e => setCelular(e.target.value)}
              className="w-full p-3 rounded-md bg-gray-50 border border-gray-200 focus:border-gray-400 outline-none" />
            <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full p-3 rounded-md bg-gray-50 border border-gray-200 focus:border-gray-400 outline-none" />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button className="w-full bg-black hover:bg-gray-800 p-3 rounded-md font-semibold transition text-white">Registrarse</button>
          </form>
          <p className="text-gray-400 text-sm mt-4">
            ¿Ya tienes cuenta?{' '}
            <button onClick={() => { setMode('login'); setError('') }} className="text-black underline hover:no-underline">Iniciar sesión</button>
          </p>
          <Link to="/" className="text-gray-400 text-sm mt-2 hover:text-black">← Volver</Link>
        </>
      )}
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
