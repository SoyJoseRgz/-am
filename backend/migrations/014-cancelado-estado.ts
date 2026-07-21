import type { MigrationBuilder } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder) {
  pgm.noTransaction()
  pgm.addTypeValue('estado_item_enum', 'cancelado')
}

export async function down(pgm: MigrationBuilder) {
  pgm.noTransaction()
  pgm.sql("DELETE FROM pg_enum WHERE enumlabel = 'cancelado' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'estado_item_enum')")
}
