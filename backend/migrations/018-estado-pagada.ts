import type { MigrationBuilder } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder) {
  pgm.noTransaction()
  pgm.addTypeValue('estado_mesa_enum', 'pagada')
}

export async function down(pgm: MigrationBuilder) {
  pgm.noTransaction()
  pgm.sql("DELETE FROM pg_enum WHERE enumlabel = 'pagada' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'estado_mesa_enum')")
}
