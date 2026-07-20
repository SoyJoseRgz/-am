import type { MigrationBuilder } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder) {
  pgm.createTable('mesa_usuarios', {
    id: { type: 'serial', primaryKey: true },
    restaurante_id: { type: 'integer', notNull: true, references: 'restaurantes', onDelete: 'cascade' },
    mesa_id: { type: 'integer', notNull: true, references: 'mesas', onDelete: 'cascade' },
    usuario_id: { type: 'integer', notNull: true, references: 'usuarios', onDelete: 'cascade' },
    codigo_invitacion: { type: 'varchar(4)', notNull: true },
    activo: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createIndex('mesa_usuarios', 'restaurante_id')
  pgm.createIndex('mesa_usuarios', ['restaurante_id', 'mesa_id'])
  pgm.addConstraint('mesa_usuarios', 'uq_mesa_usuarios_user', {
    unique: ['restaurante_id', 'mesa_id', 'usuario_id'],
  })
}

export async function down(pgm: MigrationBuilder) {
  pgm.dropTable('mesa_usuarios')
}
