import { Routes, Route, Link, Navigate, useSearchParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Mesa from './routes/Mesa'
import PrePedido from './routes/PrePedido'
import Cocina from './routes/Cocina'
import AdminLayout from './routes/AdminLayout'
import AdminCategorias from './routes/admin/Categorias'
import AdminPlatillos from './routes/admin/Platillos'
import AdminMenu from './routes/admin/Menu'
import AdminMesas from './routes/admin/Mesas'
import AdminStaff from './routes/admin/Staff'

function Home() {
  const navigate = useNavigate()
  const token = localStorage.getItem('accessToken')

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
        <Link to="/login" className="bg-black hover:bg-gray-800 px-8 py-3 rounded-md font-semibold transition text-lg text-white">
          Iniciar sesión
        </Link>
      ) : (
        <Link to="/m/2/1" className="bg-black hover:bg-gray-800 px-8 py-3 rounded-md font-semibold transition text-lg text-white">
          Mesa demo
        </Link>
      )}
      <p className="text-gray-400 text-sm mt-12">Escanea el QR de tu mesa para empezar</p>
    </div>
  )
}

function Login() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const redirect = searchParams.get('redirect')

  const [celular, setCelular] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
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

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-4">
      <h2 className="text-2xl font-bold mb-6">Iniciar sesión</h2>
      <form className="w-full max-w-sm space-y-4" onSubmit={handleSubmit}>
        <input type="tel" placeholder="Celular" value={celular} onChange={e => setCelular(e.target.value)}
          className="w-full p-3 rounded-md bg-gray-50 border border-gray-200 focus:border-gray-400 outline-none" />
        <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)}
          className="w-full p-3 rounded-md bg-gray-50 border border-gray-200 focus:border-gray-400 outline-none" />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button className="w-full bg-black hover:bg-gray-800 p-3 rounded-md font-semibold transition text-white">Entrar</button>
      </form>
      <Link to="/" className="text-gray-400 text-sm mt-4 hover:text-black">← Volver</Link>
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

function SuperPlaceholder() {
  const navigate = useNavigate()
  const [restaurantes, setRestaurantes] = useState<any[]>([])

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    fetch('/super/restaurantes', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setRestaurantes(d.restaurantes || []))
  }, [])

  return (
    <div className="min-h-screen bg-white text-black p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Super Admin</h1>
        <button onClick={() => { localStorage.clear(); navigate('/login') }} className="text-sm text-gray-400 hover:text-black">Cerrar sesión</button>
      </div>
      <p className="text-gray-500 mb-4">Restaurantes registrados: {restaurantes.length}</p>
      <ul className="space-y-2">
        {restaurantes.map((r: any) => (
          <li key={r.id} className="bg-white border border-gray-200 rounded-md p-3 flex justify-between">
            <span>{r.nombre}</span>
            <span className="text-gray-400">{r.activo ? 'Activo' : 'Inactivo'}</span>
          </li>
        ))}
      </ul>
      <Link to="/" className="text-black text-sm mt-4 inline-block border-b border-black">← Volver</Link>
    </div>
  )
}

function DashboardPlaceholder() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-white text-black p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button onClick={() => { localStorage.clear(); navigate('/login') }} className="text-sm text-gray-400 hover:text-black">Cerrar sesión</button>
      </div>
      <p className="text-gray-500">Panel del mesero — en construcción (ticket 09)</p>
      <Link to="/" className="text-black text-sm mt-4 inline-block border-b border-black">← Volver</Link>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/m/:restauranteId/:mesaId" element={<Mesa />} />
      <Route path="/m/:restauranteId/:mesaId/prepedido" element={<PrePedido />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/menu" replace />} />
        <Route path="menu" element={<AdminMenu />} />
        <Route path="categorias" element={<AdminCategorias />} />
        <Route path="platillos" element={<AdminPlatillos />} />
        <Route path="mesas" element={<AdminMesas />} />
        <Route path="staff" element={<AdminStaff />} />
      </Route>
      <Route path="/cocina" element={<Cocina />} />
      <Route path="/super/restaurantes" element={<SuperPlaceholder />} />
      <Route path="/dashboard" element={<DashboardPlaceholder />} />
    </Routes>
  )
}
