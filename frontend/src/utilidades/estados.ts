import {
  EstadoLiquidacion,
  EstadoPago,
  EstadoSolicitud,
  EstadoUsuario,
  MetodoPago,
  MetodoPagoVigente,
  RolUsuario,
  TipoMovimientoWallet,
} from '@/tipos';

/** Tonos semánticos del sistema de diseño. Cada estado se asocia a un único tono. */
export type Tono = 'neutro' | 'marca' | 'info' | 'exito' | 'advertencia' | 'peligro' | 'fresco';

export interface ConfiguracionEstado {
  texto: string;
  tono: Tono;
}

export const ESTADOS_SOLICITUD: Record<EstadoSolicitud, ConfiguracionEstado> = {
  PENDIENTE: { texto: 'Pendiente', tono: 'advertencia' },
  ASIGNADO: { texto: 'Asignado', tono: 'info' },
  ACEPTADO: { texto: 'Aceptado', tono: 'marca' },
  EN_PROCESO: { texto: 'En proceso', tono: 'fresco' },
  FINALIZADO: { texto: 'Finalizado', tono: 'exito' },
  CANCELADO: { texto: 'Cancelado', tono: 'peligro' },
};

export const ESTADOS_PAGO: Record<EstadoPago, ConfiguracionEstado> = {
  PENDIENTE: { texto: 'Pendiente de pago', tono: 'advertencia' },
  PAGADO: { texto: 'Pagado', tono: 'exito' },
  CANCELADO: { texto: 'Pago cancelado', tono: 'peligro' },
  REEMBOLSADO: { texto: 'Reembolsado', tono: 'neutro' },
};

export const ESTADOS_LIQUIDACION: Record<EstadoLiquidacion, ConfiguracionEstado> = {
  PENDIENTE: { texto: 'Pendiente', tono: 'advertencia' },
  PAGADA: { texto: 'Pagada', tono: 'exito' },
  CANCELADA: { texto: 'Cancelada', tono: 'neutro' },
};

export const TIPOS_MOVIMIENTO: Record<TipoMovimientoWallet, ConfiguracionEstado> = {
  INGRESO_SERVICIO: { texto: 'Ingreso por servicio', tono: 'exito' },
  PAGO_EFECTIVO: { texto: 'Efectivo recibido', tono: 'advertencia' },
  BONIFICACION: { texto: 'Bonificación', tono: 'fresco' },
  DESCUENTO: { texto: 'Descuento', tono: 'peligro' },
  AJUSTE: { texto: 'Ajuste', tono: 'info' },
  LIQUIDACION: { texto: 'Liquidación', tono: 'marca' },
};

export const ESTADOS_USUARIO: Record<EstadoUsuario, ConfiguracionEstado> = {
  ACTIVO: { texto: 'Activo', tono: 'exito' },
  INACTIVO: { texto: 'Inactivo', tono: 'neutro' },
};

export const TEXTO_ROL: Record<RolUsuario, string> = {
  CLIENTE: 'Cliente',
  PERSONAL_ASEO: 'Personal de aseo',
  ADMINISTRADOR: 'Administrador',
};

export const TEXTO_METODO_PAGO: Record<MetodoPago, string> = {
  SIMULADO_TARJETA: 'Tarjeta (simulada)',
  EFECTIVO: 'Efectivo',
  NEQUI: 'Nequi (histórico)',
  TRANSFERENCIA: 'Transferencia (histórico)',
};

/** Métodos que se ofrecen al cliente. Nequi y transferencia solo existen en pagos antiguos. */
export const METODOS_PAGO: MetodoPagoVigente[] = ['SIMULADO_TARJETA', 'EFECTIVO'];

/** Estados en los que un servicio está programado o en ejecución. */
export const ESTADOS_ACTIVOS: EstadoSolicitud[] = ['ASIGNADO', 'ACEPTADO', 'EN_PROCESO'];

/** Estados terminales: el servicio ya no admite cambios. */
export const ESTADOS_CERRADOS: EstadoSolicitud[] = ['FINALIZADO', 'CANCELADO'];

export const ORDEN_ESTADOS_SOLICITUD: EstadoSolicitud[] = [
  'PENDIENTE',
  'ASIGNADO',
  'ACEPTADO',
  'EN_PROCESO',
  'FINALIZADO',
  'CANCELADO',
];

/** Clases por tono para badges, puntos indicadores y barras. */
export const CLASES_TONO: Record<Tono, { badge: string; punto: string; barra: string; suave: string }> = {
  neutro: { badge: 'bg-slate-100 text-slate-700 ring-slate-200', punto: 'bg-slate-400', barra: 'bg-slate-400', suave: 'bg-slate-100 text-slate-600' },
  marca: { badge: 'bg-marca-50 text-marca-700 ring-marca-200', punto: 'bg-marca-500', barra: 'bg-marca-500', suave: 'bg-marca-50 text-marca-600' },
  info: { badge: 'bg-sky-50 text-sky-700 ring-sky-200', punto: 'bg-sky-500', barra: 'bg-sky-400', suave: 'bg-sky-50 text-sky-600' },
  exito: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', punto: 'bg-emerald-500', barra: 'bg-emerald-500', suave: 'bg-emerald-50 text-emerald-600' },
  advertencia: { badge: 'bg-amber-50 text-amber-800 ring-amber-200', punto: 'bg-amber-500', barra: 'bg-amber-400', suave: 'bg-amber-50 text-amber-600' },
  peligro: { badge: 'bg-red-50 text-red-700 ring-red-200', punto: 'bg-red-500', barra: 'bg-red-400', suave: 'bg-red-50 text-red-600' },
  fresco: { badge: 'bg-fresco-50 text-fresco-800 ring-fresco-200', punto: 'bg-fresco-500', barra: 'bg-fresco-500', suave: 'bg-fresco-50 text-fresco-700' },
};
