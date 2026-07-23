import { useEffect, useState, useRef, useMemo } from 'react'
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

export default function MenuDigital({ restauranteId, usuarioId, usuarioNombre }: {
  restauranteId: string; usuarioId: number; usuarioNombre: string
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

  useEffect(() => {
    api<{ categorias: CategoriaMenu[] }>(`/api/restaurantes/${restauranteId}/menu`)
      .then(d => { setCats(d.categorias) })
  }, [restauranteId])

  const filtered = useMemo(() => cats.map(c => ({
    ...c,
    platillos: c.platillos.filter(p =>
      !search || p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (p.descripcion || '').toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(c => c.platillos.length > 0 || !search), [cats, search])

  const visibleCats = search ? filtered : filtered.filter((_, i) => i === activeCat)
  const allFiltered = search ? filtered.flatMap(c => c.platillos) : []
  const platillos = search ? allFiltered : visibleCats.flatMap(c => c.platillos)

  function openDetail(p: PlatilloItem) {
    setSel(p); setSelMods({}); setNota(''); setCant(1)
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
      addItem({ platilloId: p.id, nombre: p.nombre, precioUnitario: Number(p.precio), notas: nota, modificadores: getModsFor(p), usuarioId, usuarioNombre })
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

  function handleQuickAdd(p: PlatilloItem) {
    if (p.agotado) return
    if (p.modificadores.length > 0) { openDetail(p); return }
    addItem({ platilloId: p.id, nombre: p.nombre, precioUnitario: Number(p.precio), notas: '', modificadores: [], usuarioId, usuarioNombre })
  }

  function handleCartDecrement(pid: number) {
    const idx = items.findIndex(i => i.usuarioId === usuarioId && i.platilloId === pid)
    if (idx < 0) return
    if (items[idx].cantidad <= 1) removeItem(idx)
    else updateCantidad(idx, -1)
  }

  function handleCartIncrement(pid: number) {
    const existing = items.find(i => i.usuarioId === usuarioId && i.platilloId === pid)
    if (!existing) return
    if (existing.modificadores.length > 0) {
      openDetail(cats.flatMap(c => c.platillos).find(p => p.id === pid)!)
      return
    }
    addItem({ platilloId: pid, nombre: existing.nombre, precioUnitario: existing.precioUnitario, notas: '', modificadores: [], usuarioId, usuarioNombre })
  }

  return (
    <div className="pb-20">
      {/* search */}
      <label className="sticky top-0 z-10 block bg-[#faf6f2] pt-2 pb-3">
        <div className="relative">
          <input
            className="w-full h-11 bg-white border border-[#e5ddd2] rounded-md px-4 text-sm outline-none focus:border-[#111] placeholder:text-[#bbb] pr-8"
            placeholder="Buscar platillo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-[#bbb] hover:text-[#111] transition-colors text-xs">
              ✕
            </button>
          )}
        </div>
      </label>

      {/* category pills */}
      {!search && (
        <div ref={tabsRef} className="flex gap-2 overflow-x-auto pb-3 snap-x scrollbar-none">
          {cats.map((c, i) => (
            <button key={c.id} onClick={() => { setActiveCat(i); setSel(null) }}
              className={`snap-start shrink-0 h-10 px-5 rounded-full text-sm font-medium transition whitespace-nowrap ${
                i === activeCat ? 'bg-[#111] text-white' : 'bg-white border border-[#e5ddd2] text-[#888] hover:text-[#111]'
              }`}>
              {c.nombre}
            </button>
          ))}
        </div>
      )}

      {/* item rows */}
      <div className="grid grid-cols-2 gap-2">
        {platillos.map(p => {
          const qty = cartQty(p.id)
          return (
            <div key={p.id} className={`bg-white border border-[#e5ddd2] rounded-md flex flex-col overflow-hidden transition ${p.agotado ? 'opacity-40' : 'hover:border-[#ccc]'}`}>
              {/* photo */}
              <button onClick={() => openDetail(p)} className="w-full aspect-[4/3] overflow-hidden">
                {p.foto_url ? (
                  <img src={p.foto_url} alt={p.nombre} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full bg-[#faf6f2] flex items-center justify-center">
                    <span className="text-[#e5ddd2] text-3xl font-bold">{p.nombre[0]}</span>
                  </div>
                )}
              </button>

              {/* info */}
              <button onClick={() => openDetail(p)} className="flex-1 text-left px-2.5 py-2 flex flex-col gap-0.5">
                <p className="text-xs font-semibold leading-tight line-clamp-2">{p.nombre}</p>
                {p.descripcion && <p className="text-[10px] text-[#888] line-clamp-1">{p.descripcion}</p>}
                <p className="text-xs font-bold mt-auto">${p.precio}</p>
              </button>

              {/* action */}
              <div className="px-2.5 pb-2.5">
                {p.agotado ? (
                  <span className="text-[9px] text-[#bbb] uppercase tracking-wider">agotado</span>
                ) : qty > 0 ? (
                  <div className="flex items-center border border-[#e5ddd2] rounded-md overflow-hidden w-fit">
                    <button onClick={() => handleCartDecrement(p.id)}
                      className="w-7 h-7 flex items-center justify-center text-sm leading-none hover:bg-[#faf6f2] transition-colors">−</button>
                    <span className="w-6 text-[11px] font-semibold text-center">{qty}</span>
                    <button onClick={() => handleCartIncrement(p.id)}
                      className="w-7 h-7 flex items-center justify-center text-sm leading-none hover:bg-[#faf6f2] transition-colors">+</button>
                  </div>
                ) : (
                  <button onClick={() => handleQuickAdd(p)}
                    className="w-full h-8 bg-[#111] text-white rounded-md text-sm flex items-center justify-center hover:bg-[#000] transition-colors">+</button>
                )}
              </div>
            </div>
          )
        })}
        {platillos.length === 0 && (
          <p className="text-[#aaa] text-center py-8 text-sm col-span-2">Sin resultados</p>
        )}
      </div>

      {/* detail sheet */}
      {sel && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end justify-center" onClick={() => setSel(null)}>
          <div className="bg-white w-full max-w-lg rounded-t-xl max-h-[75vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            {sel.foto_url && (
              <img src={sel.foto_url} alt={sel.nombre} className="w-full aspect-video object-cover rounded-t-xl" />
            )}
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-lg">{sel.nombre}</h3>
                  {sel.descripcion && <p className="text-sm text-[#888] mt-1 leading-relaxed">{sel.descripcion}</p>}
                  {sel.tiempo_preparacion && <p className="text-[11px] text-[#aaa] mt-1">~{sel.tiempo_preparacion} min</p>}
                  <p className="text-sm font-bold mt-2">${sel.precio}</p>
                </div>
                <button onClick={() => setSel(null)} className="w-7 h-7 rounded-full bg-[#faf6f2] flex items-center justify-center text-sm hover:bg-[#e5ddd2] transition-colors shrink-0">✕</button>
              </div>

              {sel.agotado ? (
                <p className="text-sm text-red-500 font-medium">Agotado</p>
              ) : (
                <>
                  {groupMods(sel.modificadores).map(g => (
                    <div key={g.nombre}>
                      <p className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">{g.nombre}</p>
                      <div className="space-y-1">
                        {g.opciones.map(o => {
                          const checked = (selMods[g.nombre] || []).includes(o.id)
                          const isRadio = o.max_seleccion_grupo === 1
                          return (
                            <label key={o.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm transition ${checked ? 'bg-[#111] text-white' : 'bg-[#faf6f2] hover:bg-[#e5ddd2]'}`}>
                              <span className="flex-1">{o.nombre}</span>
                              {Number(o.precio) > 0 && <span className="text-xs opacity-70">+${o.precio}</span>}
                              <input type={isRadio ? 'radio' : 'checkbox'} name={isRadio ? `mod-${sel.id}-${g.nombre}` : undefined}
                                checked={checked} onChange={() => toggleMod(g.nombre, o.id, o.max_seleccion_grupo)} className="sr-only" />
                              {checked && <span className="text-xs">{isRadio ? '●' : '✓'}</span>}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}

                  <textarea placeholder="Nota para cocina..." value={nota} onChange={e => setNota(e.target.value)} rows={2}
                    className="w-full text-sm border border-[#e5ddd2] rounded-lg p-3 outline-none focus:border-[#111] resize-none bg-[#faf6f2]" />

                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-[#e5ddd2] rounded-lg overflow-hidden">
                      <button onClick={() => setCant(c => Math.max(1, c - 1))} className="w-10 h-10 flex items-center justify-center text-base hover:bg-[#faf6f2]">−</button>
                      <span className="w-9 text-sm font-semibold text-center">{cant}</span>
                      <button onClick={() => setCant(c => c + 1)} className="w-10 h-10 flex items-center justify-center text-base hover:bg-[#faf6f2]">+</button>
                    </div>
                    <button onClick={() => handleAdd(sel)} className="flex-1 h-10 bg-[#111] hover:bg-[#000] text-white rounded-lg font-semibold text-sm transition">
                      Agregar ${totalPrecio(sel).toFixed(2)}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
