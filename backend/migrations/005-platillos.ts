import type { MigrationBuilder } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder) {
  pgm.createTable('platillos', {
    id: { type: 'serial', primaryKey: true },
    restaurante_id: { type: 'integer', notNull: true, references: 'restaurantes', onDelete: 'cascade' },
    categoria_id: { type: 'integer', notNull: true, references: 'categorias', onDelete: 'cascade' },
    nombre: { type: 'varchar(255)', notNull: true },
    descripcion: { type: 'text' },
    precio: { type: 'numeric(10,2)', notNull: true },
    foto_url: { type: 'varchar(255)' },
    tiempo_preparacion: { type: 'integer', default: 10 },
    activo: { type: 'boolean', notNull: true, default: true },
    agotado: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createIndex('platillos', 'restaurante_id')
  pgm.createIndex('platillos', ['restaurante_id', 'categoria_id'])
}

export async function down(pgm: MigrationBuilder) {
  pgm.dropTable('platillos')
}
