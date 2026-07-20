import type { MigrationBuilder } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder) {
  pgm.createTable('pedido_items', {
    id: { type: 'serial', primaryKey: true },
    pedido_id: { type: 'integer', notNull: true, references: 'pedidos', onDelete: 'cascade' },
    platillo_id: { type: 'integer', notNull: true, references: 'platillos', onDelete: 'restrict' },
    usuario_id: { type: 'integer', references: 'usuarios', onDelete: 'set null' },
    cantidad: { type: 'integer', notNull: true, default: 1 },
    precio_unitario: { type: 'numeric(10,2)', notNull: true },
    estado: { type: 'estado_item_enum', notNull: true, default: 'pendiente' },
    notas: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createIndex('pedido_items', 'pedido_id')
  pgm.createIndex('pedido_items', ['pedido_id', 'estado'])
}

export async function down(pgm: MigrationBuilder) {
  pgm.dropTable('pedido_items')
}
