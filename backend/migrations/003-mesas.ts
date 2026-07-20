import type { MigrationBuilder } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder) {
  pgm.createTable('mesas', {
    id: { type: 'serial', primaryKey: true },
    restaurante_id: { type: 'integer', notNull: true, references: 'restaurantes', onDelete: 'cascade' },
    numero: { type: 'integer', notNull: true },
    qr_code: { type: 'varchar(255)' },
    estado: { type: 'estado_mesa_enum', notNull: true, default: 'libre' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createIndex('mesas', 'restaurante_id')
  pgm.addConstraint('mesas', 'uq_mesas_restaurante_numero', {
    unique: ['restaurante_id', 'numero'],
  })
}

export async function down(pgm: MigrationBuilder) {
  pgm.dropTable('mesas')
}
