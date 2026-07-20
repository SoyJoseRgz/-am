import type { MigrationBuilder } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder) {
  pgm.createTable('modificadores', {
    id: { type: 'serial', primaryKey: true },
    restaurante_id: { type: 'integer', notNull: true, references: 'restaurantes', onDelete: 'cascade' },
    platillo_id: { type: 'integer', notNull: true, references: 'platillos', onDelete: 'cascade' },
    nombre_grupo: { type: 'varchar(255)', notNull: true },
    nombre_opcion: { type: 'varchar(255)', notNull: true },
    precio: { type: 'numeric(10,2)', notNull: true, default: 0 },
    max_seleccion: { type: 'integer', notNull: true, default: 1 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createIndex('modificadores', 'restaurante_id')
  pgm.createIndex('modificadores', ['platillo_id'])
}

export async function down(pgm: MigrationBuilder) {
  pgm.dropTable('modificadores')
}
