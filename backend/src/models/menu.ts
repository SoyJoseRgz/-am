import { pool } from '../db.js'

export interface MenuItem {
  id: number
  categoria_id: number
  nombre: string
  descripcion: string | null
  precio: string
  foto_url: string | null
  tiempo_preparacion: number | null
  agotado: boolean
  modificadores: ModificadorInfo[]
}

interface ModificadorInfo {
  id: number
  nombre_grupo: string
  nombre_opcion: string
  precio: string
  max_seleccion: number
}

export interface CategoriaConPlatillos {
  id: number
  nombre: string
  icono: string | null
  platillos: MenuItem[]
}

export async function getMenu(restauranteId: number): Promise<CategoriaConPlatillos[]> {
  const cats = await pool.query(
    'SELECT id, nombre, icono FROM categorias WHERE restaurante_id = $1 ORDER BY orden ASC',
    [restauranteId],
  )

  if (cats.rows.length === 0) return []

  const platillos = await pool.query(
    `SELECT id, categoria_id, nombre, descripcion, precio, foto_url, tiempo_preparacion, agotado
     FROM platillos WHERE restaurante_id = $1 AND activo = true ORDER BY id`,
    [restauranteId],
  )

  if (platillos.rows.length === 0) {
    return cats.rows.map(c => ({ ...c, platillos: [] }))
  }

  const platilloIds = platillos.rows.map(p => p.id)
  const mods = await pool.query(
    `SELECT id, platillo_id, nombre_grupo, nombre_opcion, precio, max_seleccion
     FROM modificadores WHERE platillo_id = ANY($1) ORDER BY nombre_grupo, id`,
    [platilloIds],
  )

  const modsByPlatillo: Record<number, ModificadorInfo[]> = {}
  for (const m of mods.rows) {
    if (!modsByPlatillo[m.platillo_id]) modsByPlatillo[m.platillo_id] = []
    modsByPlatillo[m.platillo_id].push({
      id: m.id,
      nombre_grupo: m.nombre_grupo,
      nombre_opcion: m.nombre_opcion,
      precio: m.precio,
      max_seleccion: m.max_seleccion,
    })
  }

  const platillosByCat: Record<number, MenuItem[]> = {}
  for (const p of platillos.rows) {
    if (!platillosByCat[p.categoria_id]) platillosByCat[p.categoria_id] = []
    platillosByCat[p.categoria_id].push({
      id: p.id,
      categoria_id: p.categoria_id,
      nombre: p.nombre,
      descripcion: p.descripcion,
      precio: p.precio,
      foto_url: p.foto_url,
      tiempo_preparacion: p.tiempo_preparacion,
      agotado: p.agotado,
      modificadores: modsByPlatillo[p.id] || [],
    })
  }

  return cats.rows.map(c => ({
    id: c.id,
    nombre: c.nombre,
    icono: c.icono,
    platillos: platillosByCat[c.id] || [],
  }))
}
