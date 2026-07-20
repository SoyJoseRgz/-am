import { useEffect, useState } from 'react'
import { api } from '../../services/api'

interface Categoria { id: number; nombre: string }
interface Platillo { id: number; categoria_id: number; nombre: string; descripcion: string | null; precio: string; foto_url: string | null; tiempo_preparacion: number | null; activo: boolean; agotado: boolean }
interface Modificador { id: number; nombre_grupo: string; nombre_opcion: string; precio: string; max_seleccion: number }

const emptyMod = { nombre_grupo: '', nombre_opcion: '', precio: '0', max_seleccion: 1 }

export default function AdminPlatillos() {
  const [cats, setCats] = useState<Categoria[]>([])
  const [plats, setPlats] = useState<Platillo[]>([])
  const [search, setSearch] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const [form, setForm] = useState({ nombre: '', descripcion: '', precio: '', categoria_id: 0, tiempo_preparacion: 10 })
  const [mods, setMods] = useState<Modificador[]>([])
  const [newMod, setNewMod] = useState({ ...emptyMod })
  const [editModId, setEditModId] = useState<number | null>(null)

  async function load() {
    try {
      const [cc, pp] = await Promise.all([
        api<Categoria[]>('/api/admin/categorias'),
        api<Platillo[]>('/api/admin/platillos'),
      ])
      setCats(cc); setPlats(pp)
    } catch (e: any) {
      setError('Error al cargar: ' + (e.message || 'desconocido'))
    }
  }

  useEffect(() => { load() }, [])

  async function loadMods(platilloId: number) {
    const mm = await api<Modificador[]>(`/api/admin/modificadores?platillo_id=${platilloId}`)
    setMods(mm)
  }

  function startEdit(p: Platillo) {
    setEditId(p.id)
    setForm({ nombre: p.nombre, descripcion: p.descripcion || '', precio: p.precio, categoria_id: p.categoria_id, tiempo_preparacion: p.tiempo_preparacion || 10 })
    loadMods(p.id)
  }

  function resetForm() {
    setEditId(null); setForm({ nombre: '', descripcion: '', precio: '', categoria_id: cats[0]?.id || 0, tiempo_preparacion: 10 }); setMods([])
  }

  async function save() {
    setError('')
    try {
      const body = { ...form, precio: Number(form.precio) }
      if (editId && editId > 0) {
        await api(`/api/admin/platillos/${editId}`, { method: 'PUT', body: JSON.stringify(body) })
        resetForm(); load()
      } else {
        const created = await api<Platillo>('/api/admin/platillos', { method: 'POST', body: JSON.stringify(body) })
        load()
        startEdit(created)
      }
    } catch (e: any) {
      setError(e.message || 'Error al guardar')
    }
  }

  async function del(id: number) {
    if (!confirm('Eliminar platillo?')) return
    setError('')
    try {
      await api(`/api/admin/platillos/${id}`, { method: 'DELETE' })
      load()
    } catch (e: any) {
      setError(e.message || 'Error al eliminar')
    }
  }

  async function duplicate(id: number) {
    setError('')
    try {
      await api(`/api/admin/platillos/${id}/duplicate`, { method: 'POST' })
      load()
    } catch (e: any) {
      setError(e.message || 'Error al duplicar')
    }
  }

  async function toggleAgotado(p: Platillo) {
    setError('')
    try {
      await api(`/api/admin/platillos/${p.id}`, { method: 'PUT', body: JSON.stringify({ agotado: !p.agotado }) })
      load()
    } catch (e: any) {
      setError(e.message || 'Error al cambiar estado')
    }
  }

  async function uploadFoto(platilloId: number, file: File) {
    const fd = new FormData()
    fd.append('foto', file)
    await api(`/api/admin/platillos/${platilloId}/foto`, { method: 'POST', body: fd })
    load()
  }

  async function saveMod() {
    if (!editId) return
    try {
      const payload = { platillo_id: editId, ...newMod, precio: Number(newMod.precio) }
      if (editModId) {
        await api(`/api/admin/modificadores/${editModId}`, { method: 'PUT', body: JSON.stringify(payload) })
      } else {
        await api('/api/admin/modificadores', { method: 'POST', body: JSON.stringify(payload) })
      }
      setNewMod({ ...emptyMod }); setEditModId(null); loadMods(editId)
    } catch (e: any) {
      setError(e.message || 'Error al guardar modificador')
    }
  }

  function editMod(m: Modificador) {
    setEditModId(m.id)
    setNewMod({ nombre_grupo: m.nombre_grupo, nombre_opcion: m.nombre_opcion, precio: m.precio, max_seleccion: m.max_seleccion })
  }

  async function delMod(id: number) {
    if (!editId) return
    await api(`/api/admin/modificadores/${id}`, { method: 'DELETE' })
    loadMods(editId)
  }

  const filtered = plats.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()))
  const currentPlatillo = editId && editId > 0 ? plats.find(p => p.id === editId) : null

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Platillos</h2>
        {!editId && (
          <button className="bg-black hover:bg-gray-800 px-4 py-2 rounded-md text-sm text-white" onClick={() => { setForm({ nombre: '', descripcion: '', precio: '', categoria_id: cats[0]?.id || 0, tiempo_preparacion: 10 }); setMods([]); setEditId(-1) }}>+ Nuevo</button>
        )}
      </div>
      {error && <p className="text-red-500 mb-2 text-sm">{error}</p>}

      {editId !== null ? (
        <>
          <div className="bg-white border border-gray-200 rounded-md p-4 space-y-3 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="bg-gray-50 border border-gray-200 rounded-md px-4 py-2" placeholder="Nombre" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              <input className="bg-gray-50 border border-gray-200 rounded-md px-4 py-2" placeholder="Precio" type="number" step="0.01" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} />
              <select className="bg-gray-50 border border-gray-200 rounded-md px-4 py-2" value={form.categoria_id} onChange={e => setForm(f => ({ ...f, categoria_id: Number(e.target.value) }))}>
                {cats.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <input className="bg-gray-50 border border-gray-200 rounded-md px-4 py-2" placeholder="Tiempo prep. (min)" type="number" value={form.tiempo_preparacion} onChange={e => setForm(f => ({ ...f, tiempo_preparacion: Number(e.target.value) }))} />
            </div>
            <textarea className="bg-gray-50 border border-gray-200 rounded-md px-4 py-2 w-full" placeholder="Descripción" rows={2} value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
            <div className="flex gap-2 items-start flex-wrap">
              <button className="bg-black hover:bg-gray-800 px-6 py-2 rounded-md text-white" onClick={save}>{editId === -1 ? 'Crear' : 'Guardar'}</button>
              {editId > 0 && (
                <label className="bg-gray-50 border border-gray-200 hover:bg-gray-100 px-4 py-2 rounded-md cursor-pointer text-sm flex items-center gap-2">
                  Subir foto
                  <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadFoto(editId, f) }} />
                </label>
              )}
              {editId > 0 && currentPlatillo?.foto_url && (
                <div className="relative">
                  <img src={currentPlatillo.foto_url} alt="" className="w-16 h-16 rounded-md object-cover border border-gray-200" />
                </div>
              )}
              <button className="text-gray-400 hover:text-black px-4" onClick={resetForm}>Cancelar</button>
            </div>
          </div>

          {editId > 0 && (
            <div className="bg-white border border-gray-200 rounded-md p-4 mb-6">
              <h3 className="font-semibold mb-3">Modificadores</h3>
              {mods.map(m => (
                <div key={m.id} className="flex items-center gap-3 py-1.5 text-sm">
                  <span className="text-gray-500">{m.nombre_grupo}:</span>
                  <span>{m.nombre_opcion}</span>
                  <span className="text-gray-500">${m.precio}</span>
                  <span className="text-gray-400 text-xs">max {m.max_seleccion}</span>
                  <button className="text-gray-400 hover:text-black ml-auto" onClick={() => editMod(m)}>Editar</button>
                  <button className="text-red-500 hover:text-red-700" onClick={() => delMod(m.id)}>✕</button>
                </div>
              ))}
              <div className="flex gap-2 mt-2 flex-wrap">
                <input className="bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm w-32" placeholder="Grupo" value={newMod.nombre_grupo} onChange={e => setNewMod(m => ({ ...m, nombre_grupo: e.target.value }))} />
                <input className="bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm w-32" placeholder="Opción" value={newMod.nombre_opcion} onChange={e => setNewMod(m => ({ ...m, nombre_opcion: e.target.value }))} />
                <input className="bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm w-20" placeholder="Precio" type="number" value={newMod.precio} onChange={e => setNewMod(m => ({ ...m, precio: e.target.value }))} />
                <input className="bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm w-16" placeholder="Max" type="number" value={newMod.max_seleccion} onChange={e => setNewMod(m => ({ ...m, max_seleccion: Number(e.target.value) }))} />
                <button className="bg-black hover:bg-gray-800 px-3 py-1.5 rounded-md text-sm text-white" onClick={saveMod}>{editModId ? 'Guardar' : '+'}</button>
                {editModId && <button className="text-gray-400 hover:text-black text-sm" onClick={() => { setNewMod({ ...emptyMod }); setEditModId(null) }}>Cancelar</button>}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <input className="bg-gray-50 border border-gray-200 rounded-md px-4 py-2 w-full mb-4" placeholder="Buscar platillo..." value={search} onChange={e => setSearch(e.target.value)} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(p => (
              <div key={p.id} className="bg-white border border-gray-200 rounded-md p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className={`font-semibold ${p.agotado ? 'line-through text-gray-400' : ''}`}>{p.nombre}</h3>
                    <p className="font-bold">${p.precio}</p>
                    {p.descripcion && <p className="text-gray-500 text-sm">{p.descripcion}</p>}
                  </div>
                  {p.foto_url && <img src={p.foto_url} alt="" className="w-16 h-16 rounded-md object-cover ml-2" />}
                </div>
                <div className="flex gap-2 mt-auto flex-wrap">
                  <button className="text-black hover:text-gray-600 text-sm" onClick={() => startEdit(p)}>Editar</button>
                  <button className="text-gray-500 text-sm hover:text-black" onClick={() => toggleAgotado(p)}>{p.agotado ? 'Disponible' : 'Agotado'}</button>
                  <button className="text-gray-400 text-sm hover:text-black" onClick={() => duplicate(p.id)}>Duplicar</button>
                  <button className="text-red-500 text-sm hover:text-red-700" onClick={() => del(p.id)}>Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
