import type { MigrationBuilder } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder) {
  pgm.createTable('pedido_item_modificadores', {
    id: { type: 'serial', primaryKey: true },
    pedido_item_id: { type: 'integer', notNull: true, references: 'pedido_items', onDelete: 'cascade' },
    modificador_id: { type: 'integer', notNull: true, references: 'modificadores', onDelete: 'restrict' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createIndex('pedido_item_modificadores', 'pedido_item_id')
}

export async function down(pgm: MigrationBuilder) {
  pgm.dropTable('pedido_item_modificadores')
}
