import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../services/api'

interface DashboardData {
  pedidos: { total: number }
  items: { total: number; pendiente: number; preparando: number; listo: number; entregado: number; cancelado: number }
  mesas: { total: number; libre: number; ocupada: number; unida: number; limpiando: number }
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<DashboardData>('/api/admin/dashboard')
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-gray-500 text-center py-12">Cargando...</div>
  if (!data) return <div className="text-red-500 text-center py-12">Error al cargar</div>

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h2 className="text-xl font-bold">Panel de control</h2>

      <div>
        <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">Pedidos</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border border-gray-200 rounded-md p-4">
            <p className="text-2xl font-bold">{data.pedidos.total}</p>
            <p className="text-xs text-gray-500">Totales</p>
          </div>
          <div className="border border-gray-200 rounded-md p-4">
            <p className="text-2xl font-bold text-yellow-600">{data.items.pendiente}</p>
            <p className="text-xs text-gray-500">Pendientes</p>
          </div>
          <div className="border border-gray-200 rounded-md p-4">
            <p className="text-2xl font-bold text-blue-600">{data.items.preparando}</p>
            <p className="text-xs text-gray-500">Preparando</p>
          </div>
          <div className="border border-gray-200 rounded-md p-4">
            <p className="text-2xl font-bold text-green-600">{data.items.listo}</p>
            <p className="text-xs text-gray-500">Listos</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">Mesas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border border-gray-200 rounded-md p-4">
            <p className="text-2xl font-bold">{data.mesas.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="border border-gray-200 rounded-md p-4">
            <p className="text-2xl font-bold text-green-600">{data.mesas.libre}</p>
            <p className="text-xs text-gray-500">Libres</p>
          </div>
          <div className="border border-gray-200 rounded-md p-4">
            <p className="text-2xl font-bold text-red-500">{data.mesas.ocupada + data.mesas.unida}</p>
            <p className="text-xs text-gray-500">Ocupadas</p>
          </div>
          <div className="border border-gray-200 rounded-md p-4">
            <p className="text-2xl font-bold text-amber-700">{data.mesas.limpiando}</p>
            <p className="text-xs text-gray-500">Limpiando</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link to="/admin/menu" className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 transition text-center">
          <p className="text-sm font-semibold">Editar menú</p>
        </Link>
        <Link to="/admin/mesas" className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 transition text-center">
          <p className="text-sm font-semibold">Gestionar mesas</p>
        </Link>
        <Link to="/admin/pedidos" className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 transition text-center">
          <p className="text-sm font-semibold">Ver pedidos</p>
        </Link>
        <Link to="/admin/staff" className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 transition text-center">
          <p className="text-sm font-semibold">Administrar staff</p>
        </Link>
      </div>
    </div>
  )
}
