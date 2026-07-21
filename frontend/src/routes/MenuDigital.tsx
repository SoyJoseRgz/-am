import { useEffect, useState, useRef } from 'react'
import { useCart } from '../stores/CartContext'
import { api } from '../services/api'

interface ModInfo {
  id: number; nombre_grupo: string; nombre_opcion: string
  precio: string; max_seleccion: number
}

interface PlatilloItem {
  id: number; categoria_id: number; nombre: string
  descripcion: string | null; precio: string; foto_url: string | null
  tiempo_preparacion: number | null; agotado: boolean
  modificadores: ModInfo[]
}

interface CategoriaMenu {
  id: number; nombre: string; icono: string | null; platillos: PlatilloItem[]
}

export default function MenuDigital({ restauranteId, usuarioId, usuarioNombre, onClose, onCartClick }: {
  restauranteId: string
  usuarioId: number
  usuarioNombre: string
  onClose?: () => void
  onCartClick?: () => void
}) {
  const [cats, setCats] = useState<CategoriaMenu[]>([])
  const [activeCat, setActiveCat] = useState(0)
  const [search, setSearch] = useState('')
  const [sel, setSel] = useState<PlatilloItem | null>(null)
  const [selMods, setSelMods] = useState<Record<string, number[]>>({})
  const [nota, setNota] = useState('')
  const [cant, setCant] = useState(1)
  const tabsRef = useRef<HTMLDivElement>(null)
  const { items, addItem, updateCantidad, removeItem } = useCart()
  const totalItems = items.filter(i => i.usuarioId === usuarioId).reduce((s, i) => s + i.cantidad, 0)

  useEffect(() => {
    api<{ categorias: CategoriaMenu[] }>(`/api/restaurantes/${restauranteId}/menu`)
      .then(d => { setCats(d.categorias) })
  }, [restauranteId])

  const filtered = cats.map(c => ({
    ...c,
    platillos: c.platillos.filter(p =>
      !search || p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (p.descripcion || '').toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(c => c.platillos.length > 0 || !search)

  const visibleCats = search ? filtered : filtered.filter((_, i) => i === activeCat)
  const allFiltered = search ? filtered.flatMap(c => c.platillos) : []

  function openDetail(p: PlatilloItem) {
    setSel(p)
    setSelMods({})
    setNota('')
    setCant(1)
  }

  function toggleMod(grupo: string, modId: number, maxSel: number) {
    setSelMods(prev => {
      const current = prev[grupo] || []
      if (current.includes(modId)) return { ...prev, [grupo]: current.filter(id => id !== modId) }
      if (maxSel === 1) return { ...prev, [grupo]: [modId] }
      if (current.length >= maxSel) return prev
      return { ...prev, [grupo]: [...current, modId] }
    })
  }

  function getModsFor(p: PlatilloItem) {
    const mods: { id: number; nombre: string; precio: number }[] = []
    for (const g of groupMods(p.modificadores)) {
      for (const sid of selMods[g.nombre] || []) {
        const opt = g.opciones.find(o => o.id === sid)
        if (opt) mods.push({ id: opt.id, nombre: opt.nombre, precio: Number(opt.precio) })
      }
    }
    return mods
  }

  function handleAdd(p: PlatilloItem) {
    for (let i = 0; i < cant; i++) {
      addItem({
        platilloId: p.id,
        nombre: p.nombre,
        precioUnitario: Number(p.precio),
        notas: nota,
        modificadores: getModsFor(p),
        usuarioId,
        usuarioNombre,
      })
    }
    setSel(null)
  }

  function totalPrecio(p: PlatilloItem) {
    const modsTotal = Object.values(selMods).flat().reduce((sum, mid) => {
      for (const g of groupMods(p.modificadores)) {
        const opt = g.opciones.find(o => o.id === mid)
        if (opt) return sum + Number(opt.precio)
      }
      return sum
    }, 0)
    return (Number(p.precio) + modsTotal) * cant
  }

  function cartQty(pid: number) {
    return items.filter(i => i.usuarioId === usuarioId && i.platilloId === pid).reduce((s, i) => s + i.cantidad, 0)
  }

  function findCartIdx(pid: number) {
    return items.findIndex(i => i.usuarioId === usuarioId && i.platilloId === pid)
  }

  function handleDecrement(pid: number) {
    const idx = findCartIdx(pid)
    if (idx < 0) return
    if (items[idx].cantidad <= 1) removeItem(idx)
    else updateCantidad(idx, -1)
  }

  function handleIncrement(p: PlatilloItem) {
    if (p.modificadores.length > 0) { openDetail(p); return }
    addItem({ platilloId: p.id, nombre: p.nombre, precioUnitario: Number(p.precio), notas: '', modificadores: [], usuarioId, usuarioNombre })
  }

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-10 bg-white pb-3 pt-2 flex flex-col gap-2">
        <input
          className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-2.5 text-sm outline-none focus:border-gray-400"
          placeholder="Buscar en el menú..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {!search && (
        <div ref={tabsRef} className="flex gap-2 overflow-x-auto pb-3 snap-x">
          {cats.map((c, i) => (
            <button
              key={c.id}
              onClick={() => { setActiveCat(i); setSel(null) }}
              className={`snap-start shrink-0 px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
                i === activeCat ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:text-black'
              }`}
            >
              {c.icono && <span className="mr-1.5">{c.icono}</span>}
              {c.nombre}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {(search ? allFiltered : visibleCats.flatMap(c => c.platillos)).map(p => (
          <div key={p.id} className={`bg-white border border-gray-200 rounded-md overflow-hidden transition hover:border-gray-400 ${p.agotado ? 'opacity-50' : ''}`}>
            <button className="w-full text-left" onClick={() => openDetail(p)}>
              {p.foto_url ? (
                <img src={p.foto_url} alt={p.nombre} className="w-full aspect-[3/2] object-cover" loading="lazy" />
              ) : (
                <div className="w-full aspect-[3/2] bg-gray-100 flex items-center justify-center">
                  <span className="text-gray-300 text-2xl font-bold">{p.nombre[0]}</span>
                </div>
              )}
            </button>
            <div className="p-2 flex items-center justify-between gap-1">
              <button className="flex-1 min-w-0 text-left" onClick={() => openDetail(p)}>
                <p className="text-xs font-semibold leading-tight line-clamp-2">{p.nombre}</p>
                <p className="text-xs font-bold mt-0.5">${p.precio}</p>
              </button>
              <div className="shrink-0">
                {cartQty(p.id) > 0 ? (
                  <div className="flex items-center border border-gray-300 rounded-md">
                    <button onClick={() => handleDecrement(p.id)} className="w-7 h-7 flex items-center justify-center text-sm hover:bg-gray-50 rounded-l-md">−</button>
                    <span className="w-6 text-xs font-semibold text-center">{cartQty(p.id)}</span>
                    <button onClick={() => handleIncrement(p)} className="w-7 h-7 flex items-center justify-center text-sm hover:bg-gray-50 rounded-r-md">+</button>
                  </div>
                ) : (
                  <button onClick={() => handleIncrement(p)} className="w-8 h-8 bg-black text-white rounded-md text-lg leading-none flex items-center justify-center hover:bg-gray-800 transition">+</button>
                )}
              </div>
            </div>
          </div>
        ))}
        {(search ? allFiltered.length === 0 : visibleCats.every(c => c.platillos.length === 0)) && (
          <p className="text-gray-400 col-span-2 sm:col-span-3 text-center py-8 text-sm">Sin resultados</p>
        )}
      </div>

      {/* Detail bottom sheet */}
      {sel && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center" onClick={() => setSel(null)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            {/* Photo + close */}
            <div className="relative">
              {sel.foto_url ? (
                <img src={sel.foto_url} alt={sel.nombre} className="w-full aspect-[4/3] object-cover" />
              ) : (
                <div className="w-full aspect-[4/3] bg-gray-100 flex items-center justify-center">
                  <span className="text-gray-300 text-5xl font-bold">{sel.nombre[0]}</span>
                </div>
              )}
              <button onClick={() => setSel(null)} className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-gray-600 hover:text-black shadow-sm">✕</button>
              {sel.agotado && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                  <span className="bg-red-500 text-white px-4 py-1.5 rounded-md text-sm font-semibold">Agotado</span>
                </div>
              )}
            </div>

            <div className="p-5 space-y-5">
              {/* Info */}
              <div>
                <h3 className="font-bold text-xl">{sel.nombre}</h3>
                {sel.descripcion && <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">{sel.descripcion}</p>}
                {sel.tiempo_preparacion && <p className="text-gray-400 text-xs mt-2">⏱ ~{sel.tiempo_preparacion} min</p>}
              </div>

              {!sel.agotado && (
                <>
                  {/* Modifiers */}
                  {groupMods(sel.modificadores).map(g => (
                    <div key={g.nombre}>
                      <p className="text-sm font-semibold text-gray-700 mb-2">{g.nombre}</p>
                      <div className="space-y-1">
                        {g.opciones.map(o => {
                          const checked = (selMods[g.nombre] || []).includes(o.id)
                          const isRadio = o.max_seleccion_grupo === 1
                          return (
                            <label key={o.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm transition ${checked ? 'bg-gray-100 ring-1 ring-gray-300' : 'hover:bg-gray-50'}`}>
                              <input
                                type={isRadio ? 'radio' : 'checkbox'}
                                name={isRadio ? `det-${sel.id}-${g.nombre}` : undefined}
                                checked={checked}
                                onChange={() => toggleMod(g.nombre, o.id, o.max_seleccion_grupo)}
                                className="accent-black"
                              />
                              <span className="flex-1">{o.nombre}</span>
                              {Number(o.precio) > 0 && <span className="text-gray-500 text-xs">+${o.precio}</span>}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Notes */}
                  <textarea
                    placeholder="Nota para cocina (opcional)..."
                    value={nota}
                    onChange={e => setNota(e.target.value)}
                    rows={2}
                    className="w-full text-sm border border-gray-200 rounded-lg p-3 outline-none focus:border-gray-400 resize-none"
                  />

                  {/* Quantity + Add */}
                  <div className="flex items-center gap-4 pt-2">
                    <div className="flex items-center border border-gray-300 rounded-lg">
                      <button onClick={() => setCant(c => Math.max(1, c - 1))} className="w-10 h-10 flex items-center justify-center text-lg hover:bg-gray-50 rounded-l-lg">−</button>
                      <span className="w-10 text-sm font-semibold text-center">{cant}</span>
                      <button onClick={() => setCant(c => c + 1)} className="w-10 h-10 flex items-center justify-center text-lg hover:bg-gray-50 rounded-r-lg">+</button>
                    </div>
                    <button onClick={() => handleAdd(sel)} className="flex-1 bg-black hover:bg-gray-800 text-white py-3 rounded-lg font-semibold text-sm transition">
                      Agregar ${totalPrecio(sel).toFixed(2)}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick-add floating button */}
      {totalItems > 0 && !sel && (
        <div className="fixed bottom-0 left-0 right-0 p-4 pointer-events-none">
          <button
            onClick={onCartClick || onClose}
            className="pointer-events-auto w-full bg-black hover:bg-gray-800 text-white py-3 rounded-md font-semibold flex items-center justify-center gap-2 transition shadow-lg"
          >
            <span>Ver pedido</span>
            <span className="bg-white text-black text-xs font-bold px-2 py-0.5 rounded-full">{totalItems}</span>
          </button>
        </div>
      )}
    </div>
  )
}

interface ModGroup {
  nombre: string
  opciones: Array<{ id: number; nombre: string; precio: string; max_seleccion_grupo: number }>
}

function groupMods(mods: ModInfo[]): ModGroup[] {
  const map = new Map<string, ModGroup>()
  for (const m of mods) {
    if (!map.has(m.nombre_grupo)) map.set(m.nombre_grupo, { nombre: m.nombre_grupo, opciones: [] })
    map.get(m.nombre_grupo)!.opciones.push({
      id: m.id, nombre: m.nombre_opcion, precio: m.precio, max_seleccion_grupo: m.max_seleccion,
    })
  }
  return Array.from(map.values())
}
