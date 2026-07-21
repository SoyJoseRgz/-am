import type { MigrationBuilder } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder) {
  pgm.addColumns('llamados', {
    usuario_id: { type: 'integer', references: 'usuarios', onDelete: 'set null' },
    mensaje: { type: 'text' },
  })
}

export async function down(pgm: MigrationBuilder) {
  pgm.dropColumns('llamados', ['usuario_id', 'mensaje'])
}
