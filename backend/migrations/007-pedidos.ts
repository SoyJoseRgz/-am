import type { MigrationBuilder } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder) {
  pgm.createTable('pedidos', {
    id: { type: 'serial', primaryKey: true },
    restaurante_id: { type: 'integer', notNull: true, references: 'restaurantes', onDelete: 'cascade' },
    mesa_id: { type: 'integer', notNull: true, references: 'mesas', onDelete: 'cascade' },
    usuario_id: { type: 'integer', references: 'usuarios', onDelete: 'set null' },
    estado: { type: 'estado_pedido_enum', notNull: true, default: 'activo' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createIndex('pedidos', 'restaurante_id')
  pgm.createIndex('pedidos', ['restaurante_id', 'mesa_id'])
}

export async function down(pgm: MigrationBuilder) {
  pgm.dropTable('pedidos')
}
