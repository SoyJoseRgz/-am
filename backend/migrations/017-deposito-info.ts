import type { MigrationBuilder } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder) {
  pgm.addColumn('restaurantes', {
    deposito_info: { type: 'jsonb' },
  })
}

export async function down(pgm: MigrationBuilder) {
  pgm.dropColumn('restaurantes', 'deposito_info')
}
