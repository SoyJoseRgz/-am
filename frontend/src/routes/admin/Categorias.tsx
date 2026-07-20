import { useEffect, useState } from 'react'
import { api } from '../../services/api'

interface Categoria {
  id: number; restaurante_id: number; nombre: string; icono: string | null; orden: number
}

const emojis = ['🍽️', '🍕', '🍔', '🌮', '🥗', '🍜', '🍣', '🥩', '🍗', '🥘', '🫓', '🍲', '🥐', '🍦', '🍰', '🍩', '☕', '🍺', '🥤', '🧃', '🍇', '🥑', '🧀', '🥚']

export default function AdminCategorias() {
  const [cats, setCats] = useState<Categoria[]>([])
  const [nombre, setNombre] = useState('')
  const [icono, setIcono] = useState('🍽️')
  const [showPicker, setShowPicker] = useState(false)
  const [editing, setEditing] = useState<Categoria | null>(null)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  async function load() {
    try {
      const data = await api<Categoria[]>('/api/admin/categorias')
      setCats(data)
    } catch (e: any) {
      setError('Error al cargar: ' + (e.message || 'desconocido'))
    }
  }

  useEffect(() => { load() }, [])

  async function save() {
    setError('')
    try {
      if (editing) {
        await api(`/api/admin/categorias/${editing.id}`, { method: 'PUT', body: JSON.stringify({ nombre, icono }) })
        setMsg('Categoría actualizada')
      } else {
        await api('/api/admin/categorias', { method: 'POST', body: JSON.stringify({ nombre, icono }) })
        setMsg('Categoría creada')
      }
      setNombre(''); setIcono('🍽️'); setEditing(null); load()
    } catch (e: any) {
      setError(e.message || 'Error al guardar')
    }
  }

  async function del(id: number) {
    if (!confirm('Eliminar categoría?')) return
    setError('')
    try {
      await api(`/api/admin/categorias/${id}`, { method: 'DELETE' })
      setMsg('Eliminada'); load()
    } catch (e: any) {
      setError(e.message || 'Error al eliminar')
    }
  }

  async function moveUp(idx: number) {
    if (idx === 0) return
    try {
      const arr = [...cats]; [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
      await api('/api/admin/categorias/reorder', { method: 'PATCH', body: JSON.stringify({ ids: arr.map(c => c.id) }) })
      setCats(arr)
    } catch (e: any) {
      setError(e.message || 'Error al reordenar')
    }
  }

  async function moveDown(idx: number) {
    if (idx === cats.length - 1) return
    try {
      const arr = [...cats]; [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
      await api('/api/admin/categorias/reorder', { method: 'PATCH', body: JSON.stringify({ ids: arr.map(c => c.id) }) })
      setCats(arr)
    } catch (e: any) {
      setError(e.message || 'Error al reordenar')
    }
  }

  function edit(c: Categoria) { setNombre(c.nombre); setIcono(c.icono || '🍽️'); setEditing(c) }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Categorías</h2>
      {msg && <p className="text-green-700 mb-2 text-sm">{msg}</p>}
      {error && <p className="text-red-500 mb-2 text-sm">{error}</p>}

      <div className="bg-white border border-gray-200 rounded-md p-4 mb-6 space-y-3">
        <div className="flex gap-2 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-gray-500 mb-1 block">Nombre</label>
            <input className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-2" placeholder="ej: Tacos, Bebidas..." value={nombre} onChange={e => setNombre(e.target.value)} />
          </div>
          <div className="relative">
            <label className="text-xs text-gray-500 mb-1 block">Icono</label>
            <button
              type="button"
              onClick={() => setShowPicker(!showPicker)}
              className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-xl h-[42px] flex items-center gap-2 hover:bg-gray-100"
            >
              {icono} <span className="text-xs text-gray-400">▼</span>
            </button>
            {showPicker && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowPicker(false)} />
                <div className="absolute top-full mt-1 right-0 z-20 bg-white border border-gray-200 rounded-md p-2 grid grid-cols-6 gap-1 shadow-lg w-[280px]">
                  {emojis.map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => { setIcono(e); setShowPicker(false) }}
                      className={`text-xl p-1.5 rounded hover:bg-gray-100 transition ${icono === e ? 'bg-gray-200 ring-1 ring-black' : ''}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button className="bg-black hover:bg-gray-800 px-6 py-2 rounded-md font-medium text-white h-[42px]" onClick={save}>
            {editing ? 'Actualizar' : 'Agregar'}
          </button>
          {editing && <button className="text-gray-400 hover:text-black text-sm h-[42px]" onClick={() => { setNombre(''); setIcono('🍽️'); setEditing(null) }}>Cancelar</button>}
        </div>
      </div>

      <div className="space-y-1">
        {cats.map((c, i) => (
          <div key={c.id} className="bg-white border border-gray-200 rounded-md px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition">
            <span className="text-gray-300 text-xs w-5 text-center font-mono">{c.orden}</span>
            <span className="text-xl w-8 text-center">{c.icono || '🍽️'}</span>
            <span className="flex-1 font-medium">{c.nombre}</span>
            <button className="text-gray-300 hover:text-black text-sm px-1" onClick={() => moveUp(i)} disabled={i === 0} title="Subir">↑</button>
            <button className="text-gray-300 hover:text-black text-sm px-1" onClick={() => moveDown(i)} disabled={i === cats.length - 1} title="Bajar">↓</button>
            <button className="text-gray-500 hover:text-black text-sm px-2" onClick={() => edit(c)}>Editar</button>
            <button className="text-red-400 hover:text-red-600 text-sm px-2" onClick={() => del(c.id)}>Eliminar</button>
          </div>
        ))}
        {cats.length === 0 && <p className="text-gray-400 text-center py-8">Crea tu primera categoría</p>}
      </div>
    </div>
  )
}
