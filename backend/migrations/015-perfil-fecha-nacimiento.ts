import type { MigrationBuilder } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder) {
  pgm.addColumn('usuarios', {
    fecha_nacimiento: { type: 'date' },
  })
}

export async function down(pgm: MigrationBuilder) {
  pgm.dropColumn('usuarios', 'fecha_nacimiento')
}
