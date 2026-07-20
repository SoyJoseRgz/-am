import type { MigrationBuilder } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder) {
  pgm.createTable('sessions', {
    id: { type: 'serial', primaryKey: true },
    usuario_id: { type: 'integer', notNull: true, references: 'usuarios', onDelete: 'cascade' },
    refresh_token: { type: 'varchar(255)', notNull: true },
    expires_at: { type: 'timestamptz', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createIndex('sessions', 'usuario_id')
  pgm.createIndex('sessions', 'refresh_token')
}

export async function down(pgm: MigrationBuilder) {
  pgm.dropTable('sessions')
}
