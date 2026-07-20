import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

export interface ModSeleccionado {
  id: number
  nombre: string
  precio: number
}

export interface CartItem {
  platilloId: number
  nombre: string
  cantidad: number
  precioUnitario: number
  notas: string
  modificadores: ModSeleccionado[]
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'cantidad'>) => void
  removeItem: (index: number) => void
  updateCantidad: (index: number, delta: number) => void
  clearCart: () => void
  totalSinIVA: number
  totalConIVA: number
}

const CartContext = createContext<CartContextType | null>(null)

const STORAGE_KEY = 'cart_items'

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const addItem = useCallback((item: Omit<CartItem, 'cantidad'>) => {
    setItems(prev => {
      const idx = prev.findIndex(i =>
        i.platilloId === item.platilloId &&
        i.notas === item.notas &&
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

  const totalConIVA = totalSinIVA

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateCantidad, clearCart, totalSinIVA, totalConIVA }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
