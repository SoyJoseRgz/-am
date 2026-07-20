import type { MigrationBuilder } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder) {
  pgm.createTable('llamados', {
    id: { type: 'serial', primaryKey: true },
    restaurante_id: { type: 'integer', notNull: true, references: 'restaurantes', onDelete: 'cascade' },
    mesa_id: { type: 'integer', notNull: true, references: 'mesas', onDelete: 'cascade' },
    tipo: { type: 'varchar(50)', notNull: true },
    estado: { type: 'estado_llamado_enum', notNull: true, default: 'activo' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createIndex('llamados', 'restaurante_id')
  pgm.createIndex('llamados', ['restaurante_id', 'mesa_id'])
}

export async function down(pgm: MigrationBuilder) {
  pgm.dropTable('llamados')
}
