import { useEffect, useState } from 'react'
import { api, getCurrentUser } from '../../services/api'
import { socket } from '../../services/socket'

interface Mesa {
  id: number; restaurante_id: number; numero: number; qr_code: string | null; estado: string
}

const estados: Record<string, string> = { libre: '🟢', ocupada: '🔴', unida: '🟡', pagada: '🔵', limpiando: '🟤' }

export default function AdminMesas() {
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [numero, setNumero] = useState('')
  const [editId, setEditId] = useState<number | null>(null)

  async function load() {
    try {
      setMesas(await api<Mesa[]>('/api/admin/mesas'))
    } catch (e: any) {
      console.error('Error al cargar mesas', e)
    }
  }
  useEffect(() => {
    load()
    socket.on('mesa:estado', load)
    socket.on('mesa:unida', load)
    socket.on('pedido:nuevo', load)
    return () => { socket.off('mesa:estado', load); socket.off('mesa:unida', load); socket.off('pedido:nuevo', load) }
  }, [])

  async function save() {
    try {
      if (editId) {
        await api(`/api/admin/mesas/${editId}`, { method: 'PUT', body: JSON.stringify({ numero: Number(numero) }) })
      } else {
        await api('/api/admin/mesas', { method: 'POST', body: JSON.stringify({ numero: Number(numero) }) })
      }
      setNumero(''); setEditId(null); load()
    } catch (e: any) {
      console.error('Error al guardar mesa', e)
    }
  }

  async function del(id: number) {
    if (!confirm('Eliminar mesa?')) return
    try {
      await api(`/api/admin/mesas/${id}`, { method: 'DELETE' })
      load()
    } catch (e: any) {
      console.error('Error al eliminar mesa', e)
    }
  }

  async function downloadQR(id: number, num: number) {
    const user = getCurrentUser()
    const token = localStorage.getItem('accessToken')
    const res = await fetch(`/api/mesas/${id}/qr?restaurante_id=${user.restaurante_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `mesa-${num}.png`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Mesas</h2>

      <div className="flex gap-2 mb-6">
        <input className="bg-gray-50 border border-gray-200 rounded-md px-4 py-2 w-32" placeholder="Número" type="number" value={numero} onChange={e => setNumero(e.target.value)} />
        <button className="bg-black hover:bg-gray-800 px-6 py-2 rounded-md font-medium text-white" onClick={save}>
          {editId ? 'Actualizar' : 'Agregar'}
        </button>
        {editId && <button className="text-gray-400 hover:text-black px-4" onClick={() => { setNumero(''); setEditId(null) }}>Cancelar</button>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {mesas.map(m => (
          <div key={m.id} className="bg-white border border-gray-200 rounded-md p-4 flex flex-col items-center gap-2">
            <span className="text-3xl">{estados[m.estado] || '⚪'}</span>
            <span className="text-lg font-bold">Mesa {m.numero}</span>
            <span className="text-xs text-gray-400 capitalize">{m.estado}</span>
            <div className="flex gap-2 mt-1">
              <button className="text-black hover:text-gray-600 text-sm" onClick={() => { setEditId(m.id); setNumero(String(m.numero)) }}>Editar</button>
              <button className="text-gray-400 text-sm hover:text-black" onClick={() => downloadQR(m.id, m.numero)}>QR</button>
              <button className="text-red-500 text-sm hover:text-red-700" onClick={() => del(m.id)}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
