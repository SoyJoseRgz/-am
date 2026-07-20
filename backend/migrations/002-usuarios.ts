import type { MigrationBuilder } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder) {
  pgm.createTable('usuarios', {
    id: { type: 'serial', primaryKey: true },
    restaurante_id: { type: 'integer', references: 'restaurantes', onDelete: 'cascade' },
    celular: { type: 'varchar(20)', notNull: true },
    password_hash: { type: 'varchar(255)', notNull: true },
    nombre: { type: 'varchar(255)', notNull: true },
    rol: { type: 'rol_enum', notNull: true },
    force_password_change: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createIndex('usuarios', 'restaurante_id')
  pgm.addConstraint('usuarios', 'uq_usuarios_restaurante_celular', {
    unique: ['restaurante_id', 'celular'],
  })
}

export async function down(pgm: MigrationBuilder) {
  pgm.dropTable('usuarios')
}
