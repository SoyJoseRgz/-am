import type { MigrationBuilder } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder) {
  pgm.addColumns('llamados', {
    split_preference: { type: 'varchar(20)' },
    tip_preference: { type: 'integer' },
  })
}

export async function down(pgm: MigrationBuilder) {
  pgm.dropColumns('llamados', ['split_preference', 'tip_preference'])
}
