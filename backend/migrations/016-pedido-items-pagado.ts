import type { MigrationBuilder } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder) {
  pgm.addColumn('pedido_items', {
    pagado: { type: 'boolean', notNull: true, default: false },
  })
}

export async function down(pgm: MigrationBuilder) {
  pgm.dropColumn('pedido_items', 'pagado')
}
