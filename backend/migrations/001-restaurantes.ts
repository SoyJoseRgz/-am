import type { MigrationBuilder } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder) {
  pgm.createType('rol_enum', ['super_admin', 'admin', 'cocina', 'mesero', 'comensal'])
  pgm.createType('estado_mesa_enum', ['libre', 'ocupada', 'unida', 'limpiando'])
  pgm.createType('estado_item_enum', ['pendiente', 'preparando', 'listo', 'entregado'])
  pgm.createType('estado_pedido_enum', ['activo', 'cerrado', 'cancelado'])
  pgm.createType('estado_llamado_enum', ['activo', 'atendido'])

  pgm.createTable('restaurantes', {
    id: { type: 'serial', primaryKey: true },
    nombre: { type: 'varchar(255)', notNull: true },
    slug: { type: 'varchar(100)', notNull: true, unique: true },
    direccion: { type: 'text' },
    telefono: { type: 'varchar(20)' },
    iva_porcentaje: { type: 'numeric(5,2)', notNull: true, default: 16 },
    iva_incluido: { type: 'boolean', notNull: true, default: true },
    plan: { type: 'varchar(50)', notNull: true, default: 'fonda' },
    activo: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })
}

export async function down(pgm: MigrationBuilder) {
  pgm.dropTable('restaurantes')
  pgm.dropType('estado_llamado_enum')
  pgm.dropType('estado_pedido_enum')
  pgm.dropType('estado_item_enum')
  pgm.dropType('estado_mesa_enum')
  pgm.dropType('rol_enum')
}
