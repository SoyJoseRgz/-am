import { useEffect, useState, useRef, useMemo } from 'react'
import { Button } from '../components/ui/button'
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
  const [loadingMenu, setLoadingMenu] = useState(true)
  const [menuError, setMenuError] = useState('')
  const [activeCat, setActiveCat] = useState(0)
  const [search, setSearch] = useState('')
  const [sel, setSel] = useState<PlatilloItem | null>(null)
  const [selMods, setSelMods] = useState<Record<string, number[]>>({})
  const [nota, setNota] = useState('')
  const [cant, setCant] = useState(1)
  const tabsRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const { items, addItem, updateCantidad, removeItem } = useCart()

  useEffect(() => {
    setLoadingMenu(true); setMenuError('')
    api<{ categorias: CategoriaMenu[] }>(`/api/restaurantes/${restauranteId}/menu`)
      .then(d => { setCats(d.categorias); setLoadingMenu(false) })
      .catch(() => { setMenuError('Error al cargar el menú'); setLoadingMenu(false) })
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
      <label className="sticky top-0 z-10 block bg-background pt-2 pb-3">
        <div className="relative">
          <input
            className="w-full h-11 bg-white border border-border rounded-md px-4 text-sm outline-none focus:border-foreground placeholder:text-muted-foreground/60 pr-8"
            placeholder="Buscar platillo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <Button variant="ghost" size="icon-xs" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
              ✕
            </Button>
          )}
        </div>
      </label>

      {/* category pills */}
      {!search && (
        <div ref={tabsRef} className="flex gap-2 overflow-x-auto pb-3 snap-x scrollbar-none">
          {cats.map((c, i) => (
            <Button key={c.id} variant={i === activeCat ? 'default' : 'outline'} size="lg"
              className={`snap-start shrink-0 rounded-full whitespace-nowrap ${i === activeCat ? '' : 'bg-white'}`}
              onClick={() => { setActiveCat(i); setSel(null); gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>
              {c.nombre}
            </Button>
          ))}
        </div>
      )}

      {/* item rows */}
      <div ref={gridRef}>
      {loadingMenu ? (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-border rounded-md overflow-hidden animate-pulse">
              <div className="w-full aspect-[4/3] bg-muted" />
              <div className="p-2.5 space-y-2">
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-2 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-1/4" />
              </div>
              <div className="px-2.5 pb-2.5">
                <div className="h-8 bg-muted rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : menuError ? (
        <div className="text-center py-10 col-span-2">
          <p className="text-muted-foreground text-sm">{menuError}</p>
          <Button variant="link" size="xs" className="text-foreground underline underline-offset-2 decoration-dotted mt-2" onClick={() => { setLoadingMenu(true); setMenuError(''); api<{ categorias: CategoriaMenu[] }>(`/api/restaurantes/${restauranteId}/menu`).then(d => { setCats(d.categorias); setLoadingMenu(false) }).catch(() => { setMenuError('Error al cargar el menú'); setLoadingMenu(false) }) }}>
            reintentar
          </Button>
        </div>
      ) : (
      <div className="grid grid-cols-2 gap-2">
        {platillos.map(p => {
          const qty = cartQty(p.id)
          return (
            <div key={p.id} className={`bg-white border border-border rounded-md flex flex-col overflow-hidden transition ${p.agotado ? 'opacity-40' : 'hover:border-muted-foreground/35'}`}>
              {/* photo */}
              <button onClick={() => openDetail(p)} className="w-full aspect-[4/3] overflow-hidden relative">
                {p.foto_url && (
                  <img src={p.foto_url} alt={p.nombre} className="absolute inset-0 w-full h-full object-cover" loading="lazy"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden') }} />
                )}
                <div className={`absolute inset-0 w-full h-full bg-background flex items-center justify-center ${p.foto_url ? 'hidden' : ''}`}>
                  <span className="text-border text-3xl font-bold">{p.nombre[0]}</span>
                </div>
              </button>

              {/* info */}
              <button onClick={() => openDetail(p)} className="flex-1 text-left px-2.5 py-2 flex flex-col gap-0.5">
                <p className="text-xs font-semibold leading-tight line-clamp-2">{p.nombre}</p>
                {p.descripcion && <p className="text-[10px] text-muted-foreground line-clamp-1">{p.descripcion}</p>}
                <p className="text-xs font-bold mt-auto">${p.precio}</p>
              </button>

              {/* action */}
              <div className="px-2.5 pb-2.5">
                {p.agotado ? (
                  <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider">agotado</span>
                ) : qty > 0 ? (
                  <div className="flex items-center border border-border rounded-md w-fit">
                    <Button variant="ghost" size="icon-xs" className="rounded-none" onClick={() => handleCartDecrement(p.id)}>−</Button>
                    <span className="w-6 text-[11px] font-semibold text-center">{qty}</span>
                    <Button variant="ghost" size="icon-xs" className="rounded-none" onClick={() => handleCartIncrement(p.id)}>+</Button>
                  </div>
                ) : (
                  <Button size="sm" className="w-full" onClick={() => handleQuickAdd(p)}>+</Button>
                )}
              </div>
            </div>
          )
        })}
        {platillos.length === 0 && (
          <p className="text-muted-foreground/70 text-center py-8 text-sm col-span-2">Sin resultados</p>
        )}
      </div>
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
                  {sel.descripcion && <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{sel.descripcion}</p>}
                  {sel.tiempo_preparacion && <p className="text-[11px] text-muted-foreground/70 mt-1">~{sel.tiempo_preparacion} min</p>}
                  <p className="text-sm font-bold mt-2">${sel.precio}</p>
                </div>
                <Button variant="ghost" size="icon-xs" className="bg-background hover:bg-border" onClick={() => setSel(null)}>✕</Button>
              </div>

              {sel.agotado ? (
                <p className="text-sm text-red-500 font-medium">Agotado</p>
              ) : (
                <>
                  {groupMods(sel.modificadores).map(g => (
                    <div key={g.nombre}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{g.nombre}</p>
                      <div className="space-y-1">
                        {g.opciones.map(o => {
                          const checked = (selMods[g.nombre] || []).includes(o.id)
                          const isRadio = o.max_seleccion_grupo === 1
                          return (
                            <label key={o.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm transition ${checked ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-border'}`}>
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
                    className="w-full text-sm border border-border rounded-lg p-3 outline-none focus:border-foreground resize-none bg-background" />

                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-border rounded-lg">
                      <Button variant="ghost" size="icon-sm" className="rounded-none" onClick={() => setCant(c => Math.max(1, c - 1))}>−</Button>
                      <span className="w-9 text-sm font-semibold text-center">{cant}</span>
                      <Button variant="ghost" size="icon-sm" className="rounded-none" onClick={() => setCant(c => Math.min(99, c + 1))}>+</Button>
                    </div>
                    <Button className="flex-1 h-10" onClick={() => handleAdd(sel)}>Agregar ${totalPrecio(sel).toFixed(2)}</Button>
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
