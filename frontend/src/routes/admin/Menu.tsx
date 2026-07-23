import { useEffect, useState } from 'react'
import { api } from '../../services/api'

interface Categoria {
  id: number; restaurante_id: number; nombre: string; icono: string | null; orden: number
}
interface Platillo {
  id: number; categoria_id: number; nombre: string; descripcion: string | null
  precio: string; foto_url: string | null; tiempo_preparacion: number | null
  activo: boolean; agotado: boolean
}
interface Modificador {
  id: number; nombre_grupo: string; nombre_opcion: string; precio: string; max_seleccion: number
}

const emojis = ['🍽️', '🍕', '🍔', '🌮', '🥗', '🍜', '🍣', '🥩', '🍗', '🥘', '🫓', '🍲', '🥐', '🍦', '🍰', '🍩', '☕', '🍺', '🥤', '🧃', '🍇', '🥑', '🧀', '🥚']
const emptyMod = { nombre_grupo: '', nombre_opcion: '', precio: '0', max_seleccion: 1 }

function CatForm({ editing, onDone }: { editing: Categoria | null; onDone: () => void }) {
  const [nombre, setNombre] = useState(editing?.nombre || '')
  const [icono, setIcono] = useState(editing?.icono || '🍽️')
  const [showPicker, setShowPicker] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!nombre.trim()) { setError('Nombre requerido'); return }
    setError('')
    try {
      if (editing) {
        await api(`/api/admin/categorias/${editing.id}`, { method: 'PUT', body: JSON.stringify({ nombre, icono }) })
      } else {
        await api('/api/admin/categorias', { method: 'POST', body: JSON.stringify({ nombre, icono }) })
      }
      onDone()
    } catch (e: any) {
      setError(e.message || 'Error')
    }
  }

  return (
    <div className="flex gap-2 items-end flex-wrap">
      <div className="flex-1 min-w-[160px]">
        <input className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm" placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} />
      </div>
      <div className="relative">
        <button type="button" onClick={() => setShowPicker(!showPicker)}
          className="bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-lg flex items-center gap-1 hover:bg-gray-100 h-[34px]">
          {icono} <span className="text-xs text-gray-400">▼</span>
        </button>
        {showPicker && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowPicker(false)} />
            <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-gray-200 rounded-md p-2 grid grid-cols-6 gap-1 shadow-lg w-[260px]">
              {emojis.map(e => (
                <button key={e} type="button"
                  onClick={() => { setIcono(e); setShowPicker(false) }}
                  className={`text-lg p-1 rounded hover:bg-gray-100 ${icono === e ? 'bg-gray-200 ring-1 ring-black' : ''}`}>
                  {e}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <button className="bg-black hover:bg-gray-800 px-4 py-1.5 rounded-md text-sm text-white h-[34px]" onClick={save}>{editing ? 'Guardar' : 'Crear'}</button>
      {editing && <button className="text-gray-400 hover:text-black text-sm h-[34px]" onClick={onDone}>Cancelar</button>}
      {error && <p className="text-red-500 text-xs w-full">{error}</p>}
    </div>
  )
}

export default function AdminMenu() {
  const [cats, setCats] = useState<Categoria[]>([])
  const [plats, setPlats] = useState<Platillo[]>([])
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [editingCat, setEditingCat] = useState<number | null>(null)
  const [newCat, setNewCat] = useState(false)
  const [editPlatId, setEditPlatId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const [form, setForm] = useState({ nombre: '', descripcion: '', precio: '', categoria_id: 0, tiempo_preparacion: 10 })
  const [mods, setMods] = useState<Modificador[]>([])
  const [newMod, setNewMod] = useState({ ...emptyMod })
  const [editModId, setEditModId] = useState<number | null>(null)
  const [search, setSearch] = useState('')

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

  function toggleExpand(catId: number) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId); else next.add(catId)
      return next
    })
  }

  function startEditPlat(p: Platillo) {
    setEditPlatId(p.id)
    setForm({ nombre: p.nombre, descripcion: p.descripcion || '', precio: p.precio, categoria_id: p.categoria_id, tiempo_preparacion: p.tiempo_preparacion || 10 })
    loadMods(p.id)
  }

  function cancelEditPlat() {
    setEditPlatId(null); setForm({ nombre: '', descripcion: '', precio: '', categoria_id: 0, tiempo_preparacion: 10 }); setMods([])
  }

  async function savePlat() {
    setError('')
    try {
      const body = { ...form, precio: Number(form.precio) }
      if (editPlatId && editPlatId > 0) {
        await api(`/api/admin/platillos/${editPlatId}`, { method: 'PUT', body: JSON.stringify(body) })
        cancelEditPlat(); load()
      } else {
        const created = await api<any>('/api/admin/platillos', { method: 'POST', body: JSON.stringify(body) })
        load()
        setEditPlatId(created.id)
        setForm({ nombre: created.nombre, descripcion: created.descripcion || '', precio: created.precio, categoria_id: created.categoria_id, tiempo_preparacion: created.tiempo_preparacion || 10 })
        loadMods(created.id)
      }
    } catch (e: any) {
      setError(e.message || 'Error al guardar platillo')
    }
  }

  async function delPlat(id: number) {
    if (!confirm('Eliminar platillo?')) return
    setError('')
    try {
      await api(`/api/admin/platillos/${id}`, { method: 'DELETE' })
      if (editPlatId === id) cancelEditPlat()
      load()
    } catch (e: any) {
      setError(e.message || 'Error al eliminar')
    }
  }

  async function duplicatePlat(id: number) {
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
      setError(e.message || 'Error')
    }
  }

  async function uploadFoto(platilloId: number, file: File) {
    const fd = new FormData()
    fd.append('foto', file)
    await api(`/api/admin/platillos/${platilloId}/foto`, { method: 'POST', body: fd })
    load()
  }

  async function delCat(id: number) {
    if (!confirm('Eliminar categoría y sus platillos?')) return
    setError('')
    try {
      await api(`/api/admin/categorias/${id}`, { method: 'DELETE' })
      load()
    } catch (e: any) {
      setError(e.message || 'Error al eliminar categoría')
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

  async function saveMod() {
    if (!editPlatId || editPlatId < 0) return
    try {
      const payload = { platillo_id: editPlatId, ...newMod, precio: Number(newMod.precio) }
      if (editModId) {
        await api(`/api/admin/modificadores/${editModId}`, { method: 'PUT', body: JSON.stringify(payload) })
      } else {
        await api('/api/admin/modificadores', { method: 'POST', body: JSON.stringify(payload) })
      }
      setNewMod({ ...emptyMod }); setEditModId(null); loadMods(editPlatId)
    } catch (e: any) {
      setError(e.message || 'Error al guardar modificador')
    }
  }

  function editMod(m: Modificador) {
    setEditModId(m.id)
    setNewMod({ nombre_grupo: m.nombre_grupo, nombre_opcion: m.nombre_opcion, precio: m.precio, max_seleccion: m.max_seleccion })
  }

  async function delMod(id: number) {
    if (!editPlatId) return
    await api(`/api/admin/modificadores/${id}`, { method: 'DELETE' })
    loadMods(editPlatId)
  }

  const currentPlatillo = editPlatId && editPlatId > 0 ? plats.find(p => p.id === editPlatId) : null

  const q = search.toLowerCase().trim()
  const catsFiltered = q ? cats.filter(c => {
    if (c.nombre.toLowerCase().includes(q)) return true
    return plats.some(p => p.categoria_id === c.id && p.nombre.toLowerCase().includes(q))
  }) : cats

  const expandedSearch = new Set(catsFiltered.map(c => c.id))

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Menú</h2>
        {!newCat && <button className="bg-black hover:bg-gray-800 px-4 py-2 rounded-md text-sm text-white" onClick={() => setNewCat(true)}>+ Nueva categoría</button>}
      </div>
      {error && <p className="text-red-500 mb-2 text-sm">{error}</p>}

      {newCat && (
        <div className="bg-white border border-gray-200 rounded-md p-3 mb-4">
          <CatForm editing={null} onDone={() => { setNewCat(false); load() }} />
        </div>
      )}

      <input className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-2 mb-4 text-sm"
        placeholder="Buscar platillo o categoría..." value={search} onChange={e => setSearch(e.target.value)} />

      <div className="space-y-2">
        {catsFiltered.map((c, i) => {
          const isExpanded = search.trim() ? expandedSearch.has(c.id) : expanded.has(c.id)
          const platsCat = q ? plats.filter(p => p.categoria_id === c.id && (c.nombre.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q))) : plats.filter(p => p.categoria_id === c.id)
          return (
          <div key={c.id} className="bg-white border border-gray-200 rounded-md overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition"
              onClick={() => toggleExpand(c.id)} style={{ cursor: 'pointer' }}>
              <span className="text-gray-400 text-sm">{isExpanded ? '▼' : '▶'}</span>
              <span className="text-xl">{c.icono || '🍽️'}</span>
              <span className="flex-1 font-medium">{c.nombre}</span>
              <span className="text-xs text-gray-400">({platsCat.length})</span>
            </div>

            {isExpanded && (
              <div className="border-t border-gray-100 bg-gray-50/50">
                <div className="flex gap-2 px-4 py-2 border-b border-gray-100 bg-gray-100/50">
                  <button className="text-gray-500 hover:text-black text-xs border border-gray-200 bg-white rounded px-2 py-1" onClick={() => moveUp(i)} disabled={i === 0}>↑ Subir</button>
                  <button className="text-gray-500 hover:text-black text-xs border border-gray-200 bg-white rounded px-2 py-1" onClick={() => moveDown(i)} disabled={i === cats.length - 1}>↓ Bajar</button>
                  <button className="text-gray-500 hover:text-black text-xs border border-gray-200 bg-white rounded px-2 py-1" onClick={() => setEditingCat(c.id)}>Editar nombre</button>
                  <button className="text-red-400 hover:text-red-600 text-xs border border-gray-200 bg-white rounded px-2 py-1" onClick={() => delCat(c.id)}>✕ Eliminar</button>
                </div>

                {editingCat === c.id && (
                  <div className="px-4 py-2 border-b border-gray-100 bg-white">
                    <CatForm editing={c} onDone={() => { setEditingCat(null); load() }} />
                  </div>
                )}

                {platsCat.map(p => (
                  <div key={p.id}>
                    {editPlatId === p.id ? (
                      <div className="p-4 border-b border-gray-200 bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <input className="bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm" placeholder="Nombre" value={form.nombre}
                            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
                          <input className="bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm" placeholder="Precio" type="number" step="0.01" value={form.precio}
                            onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} />
                          <input className="bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm" placeholder="Tiempo prep. (min)" type="number" value={form.tiempo_preparacion}
                            onChange={e => setForm(f => ({ ...f, tiempo_preparacion: Number(e.target.value) }))} />
                        </div>
                        <textarea className="bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm w-full" placeholder="Descripción" rows={2} value={form.descripcion}
                          onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
                        <div className="flex gap-2 items-start flex-wrap mt-3">
                          <button className="bg-black hover:bg-gray-800 px-4 py-1.5 rounded-md text-sm text-white" onClick={savePlat}>Guardar</button>
                          {editPlatId > 0 && (
                            <label className="bg-white border border-gray-200 hover:bg-gray-100 px-3 py-1.5 rounded-md cursor-pointer text-sm flex items-center gap-2">
                              Subir foto
                              <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadFoto(editPlatId, f) }} />
                            </label>
                          )}
                          {editPlatId > 0 && currentPlatillo?.foto_url && (
                            <img src={currentPlatillo.foto_url} alt="" className="w-12 h-12 rounded-md object-cover border border-gray-200" />
                          )}
                          <button className="text-gray-400 hover:text-black text-sm" onClick={cancelEditPlat}>Cancelar</button>
                        </div>

                        {editPlatId > 0 && (
                          <div className="mt-4 pt-3 border-t border-gray-200">
                            <h4 className="text-sm font-semibold mb-2">Modificadores</h4>
                            {mods.map(m => (
                              <div key={m.id} className="flex items-center gap-2 py-1 text-sm">
                                <span className="text-gray-500">{m.nombre_grupo}:</span>
                                <span>{m.nombre_opcion}</span>
                                <span className="text-gray-500">${m.precio}</span>
                                <span className="text-gray-400 text-xs">max {m.max_seleccion}</span>
                                <button className="text-gray-400 hover:text-black ml-auto" onClick={() => editMod(m)}>Editar</button>
                                <button className="text-red-500 hover:text-red-700" onClick={() => delMod(m.id)}>✕</button>
                              </div>
                            ))}
                            <div className="flex gap-2 mt-2 flex-wrap">
                              <input className="bg-white border border-gray-200 rounded-md px-2 py-1 text-sm w-28" placeholder="Grupo" value={newMod.nombre_grupo}
                                onChange={e => setNewMod(m => ({ ...m, nombre_grupo: e.target.value }))} />
                              <input className="bg-white border border-gray-200 rounded-md px-2 py-1 text-sm w-28" placeholder="Opción" value={newMod.nombre_opcion}
                                onChange={e => setNewMod(m => ({ ...m, nombre_opcion: e.target.value }))} />
                              <input className="bg-white border border-gray-200 rounded-md px-2 py-1 text-sm w-16" placeholder="$" type="number" value={newMod.precio}
                                onChange={e => setNewMod(m => ({ ...m, precio: e.target.value }))} />
                              <input className="bg-white border border-gray-200 rounded-md px-2 py-1 text-sm w-14" placeholder="Max" type="number" value={newMod.max_seleccion}
                                onChange={e => setNewMod(m => ({ ...m, max_seleccion: Number(e.target.value) }))} />
                              <button className="bg-black hover:bg-gray-800 px-3 py-1 rounded-md text-sm text-white" onClick={saveMod}>{editModId ? 'Guardar' : '+'}</button>
                              {editModId && <button className="text-gray-400 hover:text-black text-sm" onClick={() => { setNewMod({ ...emptyMod }); setEditModId(null) }}>Cancelar</button>}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="px-4 py-3 border-b border-gray-100 hover:bg-white transition">
                        <div className="flex items-center gap-3 text-sm">
                          <span className={`flex-1 font-medium ${p.agotado ? 'line-through text-gray-400' : ''}`}>{p.nombre}</span>
                          <span className="font-semibold">${p.precio}</span>
                          {p.foto_url && <img src={p.foto_url} alt="" className="w-8 h-8 rounded object-cover" />}
                          <button className="bg-black hover:bg-gray-800 px-3 py-1 rounded text-xs text-white" onClick={() => startEditPlat(p)}>Editar</button>
                        </div>
                        <div className="flex gap-3 mt-1 ml-1">
                          <button className="text-gray-400 hover:text-black text-xs" onClick={() => toggleAgotado(p)}>{p.agotado ? 'Disponible' : 'Agotado'}</button>
                          <button className="text-gray-400 hover:text-black text-xs" onClick={() => duplicatePlat(p.id)}>Duplicar</button>
                          <button className="text-red-400 hover:text-red-600 text-xs" onClick={() => delPlat(p.id)}>Eliminar</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <div className="p-3">
                  {editPlatId === -1 && editPlatId && form.categoria_id === c.id ? (
                    <div className="p-3 border border-gray-200 rounded-md bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                        <input className="bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm" placeholder="Nombre" value={form.nombre}
                          onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
                        <input className="bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm" placeholder="Precio" type="number" step="0.01" value={form.precio}
                          onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} />
                        <input className="bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm" placeholder="Tiempo prep. (min)" type="number" value={form.tiempo_preparacion}
                          onChange={e => setForm(f => ({ ...f, tiempo_preparacion: Number(e.target.value) }))} />
                      </div>
                      <textarea className="bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm w-full" placeholder="Descripción" rows={2} value={form.descripcion}
                        onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
                      <div className="flex gap-2 mt-2">
                        <button className="bg-black hover:bg-gray-800 px-4 py-1.5 rounded-md text-sm text-white" onClick={savePlat}>Crear</button>
                        <button className="text-gray-400 hover:text-black text-sm" onClick={() => { cancelEditPlat() }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <button className="w-full border-2 border-dashed border-gray-200 hover:border-black rounded-md py-2 text-sm text-gray-400 hover:text-black transition"
                      onClick={() => { setForm({ nombre: '', descripcion: '', precio: '', categoria_id: c.id, tiempo_preparacion: 10 }); setMods([]); setEditPlatId(-1) }}>
                      + Nuevo platillo
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          )
        })}
      </div>

      {cats.length === 0 && !newCat && (
        <p className="text-gray-400 text-center py-12">Crea tu primera categoría para empezar</p>
      )}
    </div>
  )
}
