import type { MigrationBuilder } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder) {
  pgm.createTable('pagos', {
    id: 'id',
    restaurante_id: { type: 'integer', notNull: true, references: 'restaurantes', onDelete: 'CASCADE' },
    mesa_id: { type: 'integer', notNull: true, references: 'mesas', onDelete: 'CASCADE' },
    usuario_id: { type: 'integer', notNull: true, references: 'usuarios', onDelete: 'CASCADE' },
    split_type: { type: 'text', notNull: true },
    metodo_pago: { type: 'text', notNull: true },
    cambio_para: { type: 'numeric', default: null },
    tip_pct: { type: 'numeric', default: null },
    tip_monto: { type: 'numeric', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })
  pgm.addIndex('pagos', 'restaurante_id')
  pgm.addIndex('pagos', 'mesa_id')
}

export async function down(pgm: MigrationBuilder) {
  pgm.dropTable('pagos')
}
