import { useEffect, useState } from 'react'
import { api } from '../../services/api'

export default function AdminDeposito() {
  const [banco, setBanco] = useState('')
  const [clabe, setClabe] = useState('')
  const [titular, setTitular] = useState('')
  const [activo, setActivo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    api<any>('/api/admin/deposito').then(d => {
      const info = d.deposito_info
      if (info) {
        setBanco(info.banco || ''); setClabe(info.clabe || ''); setTitular(info.titular || ''); setActivo(true)
      }
    }).finally(() => setLoading(false))
  }, [])

  async function save() {
    setMsg('')
    try {
      await api('/api/admin/deposito', {
        method: 'PUT',
        body: JSON.stringify({ deposito_info: activo ? { banco, clabe, titular } : null }),
      })
      setMsg(activo ? 'Datos de depósito guardados' : 'Depósito deshabilitado')
    } catch (e: any) {
      setMsg(e.message || 'Error al guardar')
    }
  }

  if (loading) return <div className="text-gray-500 text-center py-12">Cargando...</div>

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h2 className="text-xl font-bold">Depósito bancario</h2>
      <p className="text-sm text-gray-500">Datos para que los comensales paguen por transferencia</p>

      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" checked={activo} onChange={e => setActivo(e.target.checked)}
          className="w-4 h-4 accent-black" />
        Activar pago por depósito
      </label>

      {activo && (
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium">Banco</label>
            <input value={banco} onChange={e => setBanco(e.target.value)} placeholder="Ej: Banorte"
              className="w-full h-10 border border-gray-200 rounded-md px-3 text-sm outline-none focus:border-black" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium">CLABE</label>
            <input value={clabe} onChange={e => setClabe(e.target.value)} placeholder="18 dígitos"
              className="w-full h-10 border border-gray-200 rounded-md px-3 text-sm outline-none focus:border-black font-mono" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium">Titular</label>
            <input value={titular} onChange={e => setTitular(e.target.value)} placeholder="Nombre del titular"
              className="w-full h-10 border border-gray-200 rounded-md px-3 text-sm outline-none focus:border-black" />
          </div>
        </div>
      )}

      <button onClick={save}
        className="w-full h-11 text-sm bg-black hover:opacity-80 text-white rounded-md font-medium">
        Guardar
      </button>

      {msg && (
        <p className="text-xs text-center text-green-600 bg-green-50 border border-green-100 rounded-md px-3 py-2">{msg}</p>
      )}
    </div>
  )
}
