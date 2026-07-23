import type { MigrationBuilder } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder) {
  pgm.addColumns('pagos', {
    estado: { type: 'text', notNull: true, default: 'confirmado' },
    monto_total: { type: 'numeric', notNull: true, default: 0 },
    mesero_id: { type: 'integer', references: 'usuarios', onDelete: 'SET NULL', default: null },
  })
  pgm.sql(`UPDATE pagos SET estado = 'confirmado', monto_total = 0`)
}

export async function down(pgm: MigrationBuilder) {
  pgm.dropColumns('pagos', ['estado', 'monto_total', 'mesero_id'])
}
