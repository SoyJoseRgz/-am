import { FastifyInstance } from 'fastify'
import { pool } from '../db.js'

export default async function llamadosRoutes(app: FastifyInstance) {
  app.post<{ Params: { mesaId: string }; Body: { tipo: string; mensaje?: string; restaurante_id: number } }>(
    '/api/llamados/mesa/:mesaId',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const usuarioId = req.user!.userId
      const mesaId = parseInt(req.params.mesaId)
      const { tipo, mensaje, restaurante_id: restauranteId } = req.body

      const r = await pool.query(
        `INSERT INTO llamados (restaurante_id, mesa_id, usuario_id, tipo, mensaje)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [restauranteId, mesaId, usuarioId, tipo, mensaje || null],
      )

      const llamado = r.rows[0]
      app.io?.to(`room:restaurante:${restauranteId}`).emit('llamado:nuevo', llamado)
      reply.status(201).send(llamado)
    },
  )

  app.get(
    '/api/llamados/restaurante/:restauranteId',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const restauranteId = parseInt((req.params as any).restauranteId)
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
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const id = parseInt(req.params.id)
      const r = await pool.query(
        `UPDATE llamados SET estado = 'atendido' WHERE id = $1 RETURNING *`,
        [id],
      )
      if (r.rows.length === 0) return reply.status(404).send({ error: 'No encontrado' })
      const llamado = r.rows[0]
      app.io?.to(`room:restaurante:${llamado.restaurante_id}`).emit('llamado:atendido', llamado)
      reply.send(llamado)
    },
  )
}
