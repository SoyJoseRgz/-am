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

export default function MenuDigital({ restauranteId }: { restauranteId: string }) {
  const [cats, setCats] = useState<CategoriaMenu[]>([])
  const [activeCat, setActiveCat] = useState(0)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [selMods, setSelMods] = useState<Record<string, number[]>>({})
  const tabsRef = useRef<HTMLDivElement>(null)
  const { addItem } = useCart()

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

  function toggleExpand(pid: number) {
    setExpanded(e => ({ ...e, [pid]: !e[pid] }))
  }

  function toggleMod(platilloId: number, grupo: string, modId: number, maxSel: number) {
    const key = `${platilloId}-${grupo}`
    setSelMods(prev => {
      const current = prev[key] || []
      if (current.includes(modId)) {
        return { ...prev, [key]: current.filter(id => id !== modId) }
      }
      if (maxSel === 1) return { ...prev, [key]: [modId] }
      if (current.length >= maxSel) return prev
      return { ...prev, [key]: [...current, modId] }
    })
  }

  function handleAdd(p: PlatilloItem) {
    const modIds: number[] = []
    const mods: { id: number; nombre: string; precio: number }[] = []
    for (const g of groupMods(p.modificadores)) {
      const key = `${p.id}-${g.nombre}`
      const selected = selMods[key] || []
      for (const sid of selected) {
        const opt = g.opciones.find(o => o.id === sid)
        if (opt) {
          modIds.push(opt.id)
          mods.push({ id: opt.id, nombre: opt.nombre, precio: Number(opt.precio) })
        }
      }
    }
    addItem({
      platilloId: p.id,
      nombre: p.nombre,
      precioUnitario: Number(p.precio),
      notas: '',
      modificadores: mods,
    })
    toggleExpand(p.id)
    const toDel: string[] = []
    for (const g of groupMods(p.modificadores)) {
      const key = `${p.id}-${g.nombre}`
      toDel.push(key)
    }
    setSelMods(prev => {
      const copy = { ...prev }
      for (const k of toDel) delete copy[k]
      return copy
    })
  }

  return (
    <div className="mt-6 pb-20">
      <div className="sticky top-0 z-10 bg-white pb-3 pt-1">
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
              onClick={() => { setActiveCat(i); setExpanded({}) }}
              className={`snap-start shrink-0 px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
                i === activeCat
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-500 hover:text-black'
              }`}
            >
              {c.icono && <span className="mr-1.5">{c.icono}</span>}
              {c.nombre}
            </button>
          ))}
        </div>
      )}

      {search ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allFiltered.map(p => (
            <PlatilloCard
              key={p.id}
              platillo={p}
              expanded={!!expanded[p.id]}
              selMods={selMods}
              onToggle={() => toggleExpand(p.id)}
              onToggleMod={toggleMod}
              onAdd={() => handleAdd(p)}
            />
          ))}
          {allFiltered.length === 0 && <p className="text-gray-400 col-span-2 text-center py-8">Sin resultados</p>}
        </div>
      ) : (
        <div>
          {visibleCats.map(c => (
            <div key={c.id}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {c.platillos.map(p => (
                  <PlatilloCard
                    key={p.id}
                    platillo={p}
                    expanded={!!expanded[p.id]}
                    selMods={selMods}
                    onToggle={() => toggleExpand(p.id)}
                    onToggleMod={toggleMod}
                    onAdd={() => handleAdd(p)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!search && cats.length === 0 && (
        <p className="text-gray-400 text-center py-8">El menú está vacío</p>
      )}
    </div>
  )
}

function PlatilloCard({
  platillo, expanded, selMods, onToggle, onToggleMod, onAdd,
}: {
  platillo: PlatilloItem; expanded: boolean
  selMods: Record<string, number[]>
  onToggle: () => void; onToggleMod: (pid: number, grupo: string, mid: number, max: number) => void
  onAdd: () => void
}) {
  const p = platillo
  const modGroups = groupMods(p.modificadores)

  return (
    <div
      className={`bg-white border border-gray-200 rounded-md overflow-hidden transition ${p.agotado ? 'opacity-50' : ''}`}
    >
      {p.foto_url && (
        <img
          src={p.foto_url}
          alt={p.nombre}
          className="w-full h-32 object-cover"
          loading="lazy"
        />
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-sm ${p.agotado ? 'line-through text-gray-400' : ''}`}>
              {p.nombre}
            </h3>
            {p.descripcion && (
              <p className="text-gray-500 text-xs line-clamp-2 mt-0.5">{p.descripcion}</p>
            )}
          </div>
          <span className="font-bold text-sm shrink-0">${p.precio}</span>
        </div>

        {p.agotado ? (
          <span className="text-xs text-red-500 mt-1 inline-block">Agotado</span>
        ) : (
          <button
            onClick={onToggle}
            className="text-xs text-black hover:text-gray-600 mt-2 border-b border-black"
          >
            {expanded ? 'Ocultar ▲' : `${modGroups.length > 0 ? 'Personalizar ▼' : 'Agregar ▼'}`}
          </button>
        )}

        {expanded && !p.agotado && modGroups.length > 0 && (
          <div className="mt-3 space-y-3 border-t border-gray-200 pt-3">
            {modGroups.map(g => (
              <div key={g.nombre}>
                <p className="text-xs text-gray-500 mb-1.5 font-medium">{g.nombre}</p>
                <div className="space-y-1">
                  {g.opciones.map(o => {
                    const key = `${p.id}-${g.nombre}`
                    const sel = selMods[key] || []
                    const checked = sel.includes(o.id)
                    const isRadio = o.max_seleccion_grupo === 1
                    return (
                      <label
                        key={o.id}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs transition ${
                          checked ? 'bg-gray-100' : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type={isRadio ? 'radio' : 'checkbox'}
                          name={isRadio ? `${p.id}-${g.nombre}` : undefined}
                          checked={checked}
                          onChange={() => onToggleMod(p.id, g.nombre, o.id, o.max_seleccion_grupo)}
                          className="accent-black"
                        />
                        <span className="flex-1">{o.nombre}</span>
                        {Number(o.precio) > 0 && (
                          <span className="text-gray-500">+${o.precio}</span>
                        )}
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {expanded && !p.agotado && (
          <button
            onClick={onAdd}
            className="w-full mt-3 bg-black hover:bg-gray-800 py-2 rounded-md text-sm font-medium transition text-white"
          >
            Agregar — ${p.precio}
          </button>
        )}
      </div>
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
    if (!map.has(m.nombre_grupo)) {
      map.set(m.nombre_grupo, { nombre: m.nombre_grupo, opciones: [] })
    }
    map.get(m.nombre_grupo)!.opciones.push({
      id: m.id,
      nombre: m.nombre_opcion,
      precio: m.precio,
      max_seleccion_grupo: m.max_seleccion,
    })
  }
  return Array.from(map.values())
}
