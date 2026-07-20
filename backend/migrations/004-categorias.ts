import type { MigrationBuilder } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder) {
  pgm.createTable('categorias', {
    id: { type: 'serial', primaryKey: true },
    restaurante_id: { type: 'integer', notNull: true, references: 'restaurantes', onDelete: 'cascade' },
    nombre: { type: 'varchar(255)', notNull: true },
    icono: { type: 'varchar(100)' },
    orden: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createIndex('categorias', 'restaurante_id')
  pgm.createIndex('categorias', ['restaurante_id', 'orden'])
}

export async function down(pgm: MigrationBuilder) {
  pgm.dropTable('categorias')
}
