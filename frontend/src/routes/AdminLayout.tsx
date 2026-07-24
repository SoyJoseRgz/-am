import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { connectToRestaurante } from '../services/socket'
import { getCurrentUser, clearAppData } from '../services/api'

const links = [
  { to: '/admin', label: 'Dashboard', icon: '📊' },
  { to: '/admin/menu', label: 'Menú', icon: '📋' },
  { to: '/admin/mesas', label: 'Mesas', icon: '🪑' },
  { to: '/admin/pedidos', label: 'Pedidos', icon: '🧾' },
  { to: '/admin/deposito', label: 'Depósito', icon: '🏦' },
  { to: '/admin/staff', label: 'Staff', icon: '👥' },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const user = getCurrentUser()

  useEffect(() => {
    if (!user.restaurante_id) return
    connectToRestaurante(user.restaurante_id)
  }, [user.restaurante_id])

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="hidden md:flex flex-col w-64 bg-muted border-r border-border p-4 gap-2">
        <h1 className="text-xl font-bold mb-6">Admin</h1>
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-md transition ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`
            }
          >
            <span>{l.icon}</span>
            <span>{l.label}</span>
          </NavLink>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { clearAppData(); navigate('/login') }}
          className="mt-auto justify-start text-muted-foreground/60 hover:text-foreground px-4"
        >
          Cerrar sesión
        </Button>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border">
          <h1 className="text-lg font-bold">Admin</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { clearAppData(); navigate('/login') }}
            className="text-muted-foreground/60 hover:text-foreground"
          >
            Cerrar sesión
          </Button>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border flex justify-around py-2 z-10">
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition ${isActive ? 'text-foreground' : 'text-muted-foreground/60'}`
            }
          >
            <span className="text-lg">{l.icon}</span>
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
