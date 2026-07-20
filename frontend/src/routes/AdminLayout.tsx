import { NavLink, Outlet, useNavigate } from 'react-router-dom'

const links = [
  { to: '/admin/menu', label: 'Menú', icon: '📋' },
  { to: '/admin/mesas', label: 'Mesas', icon: '🪑' },
  { to: '/admin/staff', label: 'Staff', icon: '👥' },
]

export default function AdminLayout() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white text-black flex">
      <aside className="hidden md:flex flex-col w-64 bg-gray-50 border-r border-gray-200 p-4 gap-2">
        <h1 className="text-xl font-bold mb-6">Admin</h1>
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-md transition ${isActive ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-black'}`
            }
          >
            <span>{l.icon}</span>
            <span>{l.label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => { localStorage.clear(); navigate('/login') }}
          className="mt-auto text-gray-400 hover:text-black text-sm text-left px-4 py-2"
        >
          Cerrar sesión
        </button>
      </aside>

      <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
        <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 z-10">
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition ${isActive ? 'text-black' : 'text-gray-400'}`
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
