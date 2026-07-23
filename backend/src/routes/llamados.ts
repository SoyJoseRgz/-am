import { FastifyInstance } from 'fastify'
import { pool } from '../db.js'

export default async function llamadosRoutes(app: FastifyInstance) {
  app.post<{ Params: { mesaId: string }; Body: { tipo: string; mensaje?: string; split?: string; tip?: number } }>(
    '/api/llamados/mesa/:mesaId',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const usuarioId = req.user!.userId
      const mesaId = parseInt(req.params.mesaId)
      const { tipo, mensaje, split: splitPref, tip } = req.body

      const mesa = await pool.query('SELECT restaurante_id FROM mesas WHERE id = $1', [mesaId])
      if (mesa.rows.length === 0) return reply.status(404).send({ error: 'Mesa no encontrada' })
      const restauranteId = mesa.rows[0].restaurante_id

      const r = await pool.query(
        `INSERT INTO llamados (restaurante_id, mesa_id, usuario_id, tipo, mensaje, split_preference, tip_preference)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [restauranteId, mesaId, usuarioId, tipo, mensaje || null, splitPref || null, tip || null],
      )

      const llamado = r.rows[0]
      app.io?.to(`room:restaurante:${restauranteId}`).emit('llamado:nuevo', llamado)
      reply.status(201).send(llamado)
    },
  )

  app.get(
    '/api/llamados/restaurante/:restauranteId',
    { preHandler: [app.authenticate, app.requireRol('mesero', 'admin', 'super_admin')] },
    async (req, reply) => {
      const restauranteId = parseInt((req.params as any).restauranteId)
      if (req.user!.restauranteId !== restauranteId) return reply.status(403).send({ error: 'No autorizado' })
      const r = await pool.query(
        `SELECT ll.*, u.nombre AS usuario_nombre, m.numero AS mesa_numero
         FROM llamados ll
         LEFT JOIN usuarios u ON u.id = ll.usuario_id
         JOIN mesas m ON m.id = ll.mesa_id
         WHERE ll.restaurante_id = $1 AND ll.estado = 'activo'
         ORDER BY ll.created_at DESC`,
        [restauranteId],
      )
      reply.send(r.rows)
    },
  )

  app.put<{ Params: { id: string } }>(
    '/api/llamados/:id/atender',
    { preHandler: [app.authenticate, app.requireRol('mesero', 'admin', 'super_admin')] },
    async (req, reply) => {
      const id = parseInt(req.params.id)
      const rid = req.user!.restauranteId!
      const r = await pool.query(
        `UPDATE llamados SET estado = 'atendido' WHERE id = $1 AND restaurante_id = $2 RETURNING *`,
        [id, rid],
      )
      if (r.rows.length === 0) return reply.status(404).send({ error: 'No encontrado' })
      const llamado = r.rows[0]
      app.io?.to(`room:restaurante:${llamado.restaurante_id}`).emit('llamado:atendido', llamado)
      reply.send(llamado)
    },
  )
}
