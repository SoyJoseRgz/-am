import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import 'dotenv/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FOTOS_DIR = process.env.FOTOS_DIR || path.join(__dirname, '../uploads/fotos')
import { runMigrations } from './db.js'
import authPlugin from './plugins/auth.js'
import authRoutes from './routes/auth.js'
import superRoutes from './routes/super.js'
import mesaRoutes from './routes/mesas.js'
import adminRoutes from './routes/admin.js'
import menuRoutes from './routes/menu.js'
import pedidoRoutes, { cocinaRoutes, adminCocinaRoutes } from './routes/pedidos.js'
import { setupSocketIO } from './sockets/index.js'
import { seedSuperAdmin } from './seed.js'
import llamadosRoutes from './routes/llamados.js'
import meseroRoutes from './routes/mesero.js'

const app = Fastify({ logger: true })

await app.register(cors, { origin: true })
await app.register(authPlugin)
await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } })

app.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

app.get('/fotos/:restauranteId/:filename', async (request, reply) => {
  const { restauranteId, filename } = request.params as { restauranteId: string; filename: string }
  const filePath = path.join(FOTOS_DIR, restauranteId, filename)
  try {
    const buf = await fs.readFile(filePath)
    const ext = path.extname(filename).toLowerCase()
    const mime: Record<string, string> = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' }
    reply.header('Content-Type', mime[ext] || 'application/octet-stream')
    reply.header('Cache-Control', 'public, max-age=86400')
    return reply.send(buf)
  } catch {
    return reply.status(404).send({ error: 'No encontrada' })
  }
})

await app.register(authRoutes)
await app.register(superRoutes)
await app.register(mesaRoutes)
await app.register(pedidoRoutes)
await app.register(cocinaRoutes)
await app.register(adminCocinaRoutes)
await app.register(adminRoutes)
await app.register(menuRoutes)
await app.register(llamadosRoutes)
await app.register(meseroRoutes)

setupSocketIO(app)

try {
  await runMigrations()
  await seedSuperAdmin()
  app.log.info('Migrations complete')
} catch (err) {
  app.log.error(err as Error, 'Migration failed')
  process.exit(1)
}

try {
  await app.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
