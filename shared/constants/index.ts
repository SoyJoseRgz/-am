export const ROLES = ['super_admin', 'admin', 'mesero', 'cocina', 'comensal'] as const
export type Rol = (typeof ROLES)[number]

export const ESTADOS_MESA = ['libre', 'ocupada', 'unida', 'limpiando'] as const
export type EstadoMesa = (typeof ESTADOS_MESA)[number]

export const ESTADOS_ITEM = ['pendiente', 'preparando', 'listo', 'entregado'] as const
export type EstadoItem = (typeof ESTADOS_ITEM)[number]

export const ESTADOS_PEDIDO = ['activo', 'cerrado', 'cancelado'] as const
export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number]

export const IVA_DEFAULT = 16
export const IVA_MIN = 0
export const IVA_MAX = 25

export const ACCESS_TOKEN_EXPIRES = '15m'
export const REFRESH_TOKEN_EXPIRES = '7d'
