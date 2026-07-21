import type { MigrationBuilder } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder) {
  pgm.sql("ALTER TYPE estado_item_enum ADD VALUE 'cancelado'")
}

export async function down(pgm: MigrationBuilder) {
  pgm.sql("DELETE FROM pg_enum WHERE enumlabel = 'cancelado' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'estado_item_enum')")
}
