import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

interface ModSeleccionado {
  id: number
  nombre: string
  precio: number
}

interface CartItem {
  platilloId: number
  nombre: string
  cantidad: number
  precioUnitario: number
  notas: string
  modificadores: ModSeleccionado[]
  usuarioId: number
  usuarioNombre: string
}

interface ItemsPorComensal {
  usuarioId: number
  usuarioNombre: string
  items: CartItem[]
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'cantidad'>) => void
  removeItem: (index: number) => void
  updateCantidad: (index: number, delta: number) => void
  clearCart: () => void
  totalSinIVA: number
  itemsPorComensal: ItemsPorComensal[]
}

const CartContext = createContext<CartContextType | null>(null)

function storageKey(suffix?: string) {
  const uid = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}').id } catch { return 0 } })()
  return suffix ? `cart_${suffix}` : `cart_items_${uid}`
}

function loadCart(suffix?: string): CartItem[] {
  try {
    const raw = localStorage.getItem(storageKey(suffix))
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function CartProvider({ children, cartKey }: { children: ReactNode; cartKey?: string }) {
  const [items, setItems] = useState<CartItem[]>(() => loadCart(cartKey))

  useEffect(() => {
    localStorage.setItem(storageKey(cartKey), JSON.stringify(items))
  }, [items, cartKey])

  const addItem = useCallback((item: Omit<CartItem, 'cantidad'>) => {
    setItems(prev => {
      const idx = prev.findIndex(i =>
        i.platilloId === item.platilloId &&
        i.notas === item.notas &&
        i.usuarioId === item.usuarioId &&
        JSON.stringify(i.modificadores) === JSON.stringify(item.modificadores)
      )
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = { ...copy[idx], cantidad: copy[idx].cantidad + 1 }
        return copy
      }
      return [...prev, { ...item, cantidad: 1 }]
    })
  }, [])

  const removeItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updateCantidad = useCallback((index: number, delta: number) => {
    setItems(prev => {
      const copy = [...prev]
      const newCant = copy[index].cantidad + delta
      if (newCant <= 0) return copy.filter((_, i) => i !== index)
      copy[index] = { ...copy[index], cantidad: newCant }
      return copy
    })
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const totalSinIVA = items.reduce((sum, item) => {
    const base = item.precioUnitario * item.cantidad
    const mods = item.modificadores.reduce((m, mod) => m + mod.precio, 0) * item.cantidad
    return sum + base + mods
  }, 0)

  const porComensal = items.reduce<ItemsPorComensal[]>((acc, item) => {
    const grupo = acc.find(g => g.usuarioId === item.usuarioId)
    if (grupo) {
      grupo.items.push(item)
    } else {
      acc.push({ usuarioId: item.usuarioId, usuarioNombre: item.usuarioNombre, items: [item] })
    }
    return acc
  }, [])

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateCantidad, clearCart, totalSinIVA, itemsPorComensal: porComensal }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
