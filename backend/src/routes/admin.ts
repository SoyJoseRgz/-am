import type { FastifyInstance } from 'fastify'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import * as Categoria from '../models/categoria.js'
import * as Platillo from '../models/platillo.js'
import * as Modificador from '../models/modificador.js'
import * as Mesa from '../models/mesa.js'
import * as Staff from '../models/staff.js'
import * as Pedido from '../models/pedido.js'
import { hashPassword } from '../services/auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FOTOS_DIR = process.env.FOTOS_DIR || path.join(__dirname, '../../uploads/fotos')

export default async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)
  app.addHook('preHandler', app.requireRol('admin', 'super_admin'))

  // ── Categorías ──
  app.get('/api/admin/categorias', async (request) => {
    return Categoria.findByRestaurante(request.user!.restauranteId!)
  })

  app.post('/api/admin/categorias', async (request) => {
    const body = request.body as any
    return Categoria.create({ ...body, restaurante_id: request.user!.restauranteId! })
  })

  app.put('/api/admin/categorias/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const updated = await Categoria.update(Number(id), request.body as any)
    if (!updated) return reply.status(404).send({ error: 'No encontrada' })
    return updated
  })

  app.delete('/api/admin/categorias/:id', async (request) => {
    const { id } = request.params as { id: string }
    await Categoria.remove(Number(id))
    return { success: true }
  })

  app.patch('/api/admin/categorias/reorder', async (request) => {
    const { ids } = request.body as { ids: number[] }
    for (let i = 0; i < ids.length; i++) {
      await Categoria.update(ids[i], { orden: i })
    }
    return { success: true }
  })

  // ── Platillos ──
  app.get('/api/admin/platillos', async (request) => {
    return Platillo.findByRestaurante(request.user!.restauranteId!)
  })

  app.post('/api/admin/platillos', async (request) => {
    return Platillo.create({ ...request.body as any, restaurante_id: request.user!.restauranteId! })
  })

  app.put('/api/admin/platillos/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const updated = await Platillo.update(Number(id), request.body as any)
    if (!updated) return reply.status(404).send({ error: 'No encontrado' })
    return updated
  })

  app.delete('/api/admin/platillos/:id', async (request) => {
    const { id } = request.params as { id: string }
    await Platillo.remove(Number(id))
    return { success: true }
  })

  app.post('/api/admin/platillos/:id/duplicate', async (request, reply) => {
    const { id } = request.params as { id: string }
    const dup = await Platillo.duplicate(Number(id))
    if (!dup) return reply.status(404).send({ error: 'No encontrado' })
    return dup
  })

  app.post('/api/admin/platillos/:id/foto', async (request, reply) => {
    const { id } = request.params as { id: string }
    const platilloId = Number(id)

    const data = await request.file()
    if (!data) return reply.status(400).send({ error: 'Archivo requerido' })

    const buffer = await data.toBuffer()
    const ext = data.filename.split('.').pop()?.toLowerCase()
    if (!['jpg', 'jpeg', 'png'].includes(ext || '')) {
      return reply.status(400).send({ error: 'Solo JPG o PNG' })
    }
    if (buffer.length > 5 * 1024 * 1024) {
      return reply.status(400).send({ error: 'Máximo 5MB' })
    }

    const restauranteId = request.user!.restauranteId!
    const dir = path.join(FOTOS_DIR, String(restauranteId))
    await fs.mkdir(dir, { recursive: true })
    const dest = path.join(dir, `${platilloId}.webp`)
    await sharp(buffer).resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toFile(dest)

    const fotoUrl = `/fotos/${restauranteId}/${platilloId}.webp`
    const updated = await Platillo.updateFoto(platilloId, fotoUrl)
    return updated
  })

  // ── Modificadores ──
  app.get('/api/admin/modificadores', async (request) => {
    const { platillo_id } = request.query as { platillo_id: string }
    return Modificador.findByPlatillo(Number(platillo_id))
  })

  app.post('/api/admin/modificadores', async (request) => {
    return Modificador.create({ ...request.body as any, restaurante_id: request.user!.restauranteId! })
  })

  app.put('/api/admin/modificadores/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const updated = await Modificador.update(Number(id), request.body as any)
    if (!updated) return reply.status(404).send({ error: 'No encontrado' })
    return updated
  })

  app.delete('/api/admin/modificadores/:id', async (request) => {
    const { id } = request.params as { id: string }
    await Modificador.remove(Number(id))
    return { success: true }
  })

  // ── Mesas ──
  app.get('/api/admin/mesas', async (request) => {
    return Mesa.findAllByRestaurante(request.user!.restauranteId!)
  })

  app.post('/api/admin/mesas', async (request) => {
    return Mesa.create({ ...request.body as any, restaurante_id: request.user!.restauranteId! })
  })

  app.put('/api/admin/mesas/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const updated = await Mesa.update(Number(id), request.body as any)
    if (!updated) return reply.status(404).send({ error: 'No encontrada' })
    return updated
  })

  app.delete('/api/admin/mesas/:id', async (request) => {
    const { id } = request.params as { id: string }
    await Mesa.remove(Number(id))
    return { success: true }
  })

  // ── Pedidos ──
  app.get('/api/admin/pedidos', async (request) => {
    return Pedido.findForAdmin(request.user!.restauranteId!)
  })

  // ── Staff ──
  app.get('/api/admin/staff', async (request) => {
    return Staff.findByRestaurante(request.user!.restauranteId!)
  })

  app.post('/api/admin/staff', async (request, reply) => {
    const { nombre, celular, password, rol } = request.body as any
    if (!nombre || !celular || !password || !rol) {
      return reply.status(400).send({ error: 'Todos los campos son requeridos' })
    }
    try {
      const password_hash = await hashPassword(password)
      return await Staff.create({ restaurante_id: request.user!.restauranteId!, nombre, celular, password_hash, rol })
    } catch (e: any) {
      if (e.message?.includes('ya está registrado')) {
        return reply.status(409).send({ error: e.message })
      }
      throw e
    }
  })

  app.put('/api/admin/staff/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const updated = await Staff.update(Number(id), request.body as any)
    if (!updated) return reply.status(404).send({ error: 'No encontrado' })
    return updated
  })

  app.delete('/api/admin/staff/:id', async (request) => {
    const { id } = request.params as { id: string }
    await Staff.remove(Number(id))
    return { success: true }
  })
}
