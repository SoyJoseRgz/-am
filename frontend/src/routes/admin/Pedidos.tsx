import { useState, useEffect } from 'react'
import { api } from '../../services/api'

interface Item {
  id: number
  platillo_id: number
  nombre: string
  cantidad: number
  precio_unitario: string
  estado: string
  notas: string | null
  created_at: string
}

interface Pedido {
  id: number
  mesa_numero: number
  comensal_nombre: string | null
  estado: string
  created_at: string
  items: Item[]
}

export default function AdminPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/api/admin/pedidos')
      .then(setPedidos)
      .finally(() => setLoading(false))
  }, [])

  const totalCancelados = pedidos.reduce((s, p) => s + p.items.filter(i => i.estado === 'cancelado').length, 0)
  const totalCompletados = pedidos.reduce((s, p) => s + p.items.filter(i => i.estado === 'entregado').length, 0)
  const totalActivos = pedidos.reduce((s, p) => s + p.items.filter(i => !['entregado', 'cancelado'].includes(i.estado)).length, 0)

  if (loading) return <div className="text-gray-500 text-center py-12">Cargando pedidos...</div>

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h2 className="text-xl font-bold">Pedidos</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border border-gray-200 rounded-md p-4">
          <p className="text-2xl font-bold">{pedidos.length}</p>
          <p className="text-xs text-gray-500">Pedidos totales</p>
        </div>
        <div className="border border-gray-200 rounded-md p-4">
          <p className="text-2xl font-bold">{totalActivos}</p>
          <p className="text-xs text-gray-500">Items activos</p>
        </div>
        <div className="border border-gray-200 rounded-md p-4">
          <p className="text-2xl font-bold text-green-600">{totalCompletados}</p>
          <p className="text-xs text-gray-500">Items completados</p>
        </div>
        <div className="border border-gray-200 rounded-md p-4">
          <p className="text-2xl font-bold text-red-500">{totalCancelados}</p>
          <p className="text-xs text-gray-500">Items cancelados</p>
        </div>
      </div>

      <div className="space-y-3">
        {pedidos.map(ped => {
          const cancelados = ped.items.filter(i => i.estado === 'cancelado')
          return (
            <div key={ped.id} className="border border-gray-200 rounded-md p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-semibold">Mesa {ped.mesa_numero}</span>
                  <span className="text-xs text-gray-400">#{ped.id}</span>
                  {ped.comensal_nombre && <span className="text-xs text-gray-500">{ped.comensal_nombre}</span>}
                </div>
                <span className="text-xs text-gray-400">{new Date(ped.created_at).toLocaleString('es-MX')}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ped.items.map(item => (
                  <span
                    key={item.id}
                    className={`text-xs px-2 py-0.5 rounded-md border ${
                      item.estado === 'cancelado'
                        ? 'border-red-200 text-red-400 line-through bg-red-50'
                        : item.estado === 'entregado'
                        ? 'border-green-200 text-green-600 bg-green-50'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    {item.cantidad}x {item.nombre}
                    {item.estado === 'cancelado' && item.notas?.includes('CANCELADO:') && (
                      <span className="text-red-300 ml-1">({item.notas.replace('CANCELADO: ', '')})</span>
                    )}
                  </span>
                ))}
              </div>
              {cancelados.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-red-400 cursor-pointer">Cancelados ({cancelados.length})</summary>
                  <div className="mt-1 space-y-0.5">
                    {cancelados.map(i => (
                      <p key={i.id} className="text-xs text-red-400 line-through">
                        {i.cantidad}x {i.nombre}{i.notas?.includes('CANCELADO:') ? ' — ' + i.notas.replace('CANCELADO: ', '') : ''}
                      </p>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )
        })}
        {pedidos.length === 0 && <p className="text-gray-400 text-center py-8">No hay pedidos aún</p>}
      </div>
    </div>
  )
}
