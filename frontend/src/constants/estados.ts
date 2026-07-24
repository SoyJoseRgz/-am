export const MESA_ESTADO_LABEL: Record<string, string> = {
  libre: 'Libre', ocupada: 'Ocupada', unida: 'Unida', pagada: 'Pagada', limpiando: 'Limpiando',
}

export const ITEM_ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente', preparando: 'Preparando', listo: 'Listo', entregado: 'Entregado', cancelado: 'Cancelado',
}

export const ITEM_ESTADO_DOT: Record<string, string> = {
  pendiente: 'bg-yellow-400', preparando: 'bg-blue-400', listo: 'bg-green-400', entregado: 'bg-muted-foreground/30', cancelado: 'bg-red-400',
}

export const ITEM_ESTADO_BG: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800', preparando: 'bg-blue-100 text-blue-800',
  listo: 'bg-green-100 text-green-800', entregado: 'bg-muted text-muted-foreground', cancelado: 'bg-red-100 text-red-800',
}

export const ITEM_ESTADO_BORDER: Record<string, string> = {
  pendiente: 'border-yellow-300', preparando: 'border-blue-300', listo: 'border-green-300',
  entregado: 'border-border', cancelado: 'border-red-200',
}

export const ESTADOS_ITEM = ['pendiente', 'preparando', 'listo', 'entregado'] as const
