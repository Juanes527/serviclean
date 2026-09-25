export type RolUsuario = 'CLIENTE' | 'PERSONAL_ASEO' | 'ADMINISTRADOR';
export type EstadoUsuario = 'ACTIVO' | 'INACTIVO';
export type EstadoSolicitud = 'PENDIENTE' | 'ASIGNADO' | 'ACEPTADO' | 'EN_PROCESO' | 'FINALIZADO' | 'CANCELADO';
/** SIMULADO_TARJETA y EFECTIVO son los vigentes; TRANSFERENCIA y NEQUI solo aparecen en pagos históricos. */
export type MetodoPago = 'SIMULADO_TARJETA' | 'EFECTIVO' | 'TRANSFERENCIA' | 'NEQUI';
export type MetodoPagoVigente = 'SIMULADO_TARJETA' | 'EFECTIVO';
export type EstadoPago = 'PENDIENTE' | 'PAGADO' | 'CANCELADO' | 'REEMBOLSADO';
export type MarcaTarjeta = 'VISA' | 'MASTERCARD' | 'AMEX' | 'DINERS' | 'OTRA';
export type TipoMovimientoWallet = 'INGRESO_SERVICIO' | 'PAGO_EFECTIVO' | 'BONIFICACION' | 'DESCUENTO' | 'AJUSTE' | 'LIQUIDACION';
export type EstadoLiquidacion = 'PENDIENTE' | 'PAGADA' | 'CANCELADA';

export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  rol: RolUsuario;
  estado: EstadoUsuario;
  fechaCreacion: string;
}

export interface Servicio {
  id: string;
  nombre: string;
  descripcion: string;
  precioBase: string;
  duracionMinutos: number;
  icono: string;
  activo: boolean;
}

export interface Asignacion {
  id: string;
  personalId: string;
  personal?: Usuario;
  fechaAsignacion: string;
  observaciones?: string | null;
}

export interface Pago {
  id: string;
  referencia: string;
  solicitudId: string;
  monto: string;
  metodo: MetodoPago;
  estado: EstadoPago;
  porcentajeComision: string | null;
  montoComision: string | null;
  montoPersonal: string | null;
  /** Únicos datos de tarjeta que existen: nunca se envían ni guardan el número completo ni el CVV. */
  tarjetaUltimos4: string | null;
  tarjetaMarca: MarcaTarjeta | null;
  fecha: string;
  cliente?: Usuario;
  solicitud?: Solicitud;
}

export interface Calificacion {
  id: string;
  puntuacion: number;
  comentario?: string | null;
  fechaCreacion: string;
}

export interface Solicitud {
  id: string;
  clienteId: string;
  cliente?: Usuario;
  servicioId: string;
  servicio: Servicio;
  fecha: string;
  hora: string;
  direccion: string;
  telefono: string;
  observaciones?: string | null;
  metodoPago: MetodoPago;
  estado: EstadoSolicitud;
  fechaCreacion: string;
  asignacion?: Asignacion | null;
  pago?: Pago | null;
  calificacion?: Calificacion | null;
}

export interface Disponibilidad {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
}

export interface Notificacion {
  id: string;
  mensaje: string;
  leida: boolean;
  fechaCreacion: string;
}

export interface ResumenReportes {
  totalUsuarios: number;
  totalClientes: number;
  totalPersonal: number;
  totalServicios: number;
  solicitudesPendientes: number;
  solicitudesFinalizadas: number;
  solicitudesCanceladas: number;
  totalPagos: number;
  ingresosTotales: number;
}

export interface MovimientoWallet {
  id: string;
  numero: number;
  tipo: TipoMovimientoWallet;
  concepto: string;
  monto: string;
  saldoAnterior: string;
  saldoPosterior: string;
  fecha: string;
  solicitudId: string | null;
  solicitud?: { id: string; fecha?: string; servicio: { nombre: string } } | null;
  pago?: { referencia: string; metodo: MetodoPago } | null;
  liquidacion?: { id: string; numero: number } | null;
  autorizadoPor?: { nombre: string; apellido: string } | null;
  wallet?: { personal: Usuario };
}

export interface Liquidacion {
  id: string;
  numero: number;
  periodoInicio: string;
  periodoFin: string;
  saldoInicial: string;
  ingresos: string;
  descuentos: string;
  ajustes: string;
  monto: string;
  estado: EstadoLiquidacion;
  observaciones: string | null;
  fechaCreacion: string;
  fechaPago: string | null;
  fechaCancelacion: string | null;
  wallet: { personalId: string; personal: Usuario };
  creadaPor?: { nombre: string; apellido: string } | null;
  pagadaPor?: { nombre: string; apellido: string } | null;
  movimiento?: { id: string; numero: number; monto: string; saldoAnterior: string; saldoPosterior: string; fecha: string } | null;
  movimientos?: MovimientoWallet[];
}

/** Resumen de la wallet de un integrante del personal (valores en pesos). */
export interface ResumenWallet {
  personal: Usuario;
  walletId: string | null;
  saldo: number;
  saldoDisponible: number;
  saldoPendiente: number;
  totalGenerado: number;
  generadoTarjeta: number;
  generadoEfectivo: number;
  efectivoRecibido: number;
  bonificaciones: number;
  descuentos: number;
  ajustes: number;
  totalLiquidado: number;
  serviciosLiquidados: number;
  liquidacionPendiente: { id: string; numero: number; monto: string } | null;
}

export interface VistaPreviaLiquidacion {
  periodoInicio: string;
  periodoFin: string;
  cantidadMovimientos: number;
  saldoInicial: number;
  ingresos: number;
  descuentos: number;
  ajustes: number;
  monto: number;
  liquidacionPendiente: { id: string; numero: number } | null;
  motivo: string | null;
}

export interface ResumenFinanciero {
  periodo: { desde: string | null; hasta: string | null };
  porcentajeComision: number;
  servicios: { ingresosBrutos: number; cantidadPagos: number };
  plataforma: {
    recibido: number;
    tarjetaSimulada: number;
    cantidadTarjeta: number;
    otrosMetodos: number;
    cantidadOtrosMetodos: number;
    reembolsado: number;
    caja: number;
  };
  efectivo: { entregadoAlPersonal: number; cantidad: number; comisionPorCobrar: number };
  serviclean: { comision: number; comisionTarjeta: number; comisionEfectivo: number };
  personal: {
    generado: number;
    liquidado: number;
    cantidadLiquidaciones: number;
    liquidacionesPendientes: number;
    cantidadLiquidacionesPendientes: number;
    saldoPorLiquidar: number;
    trabajadoresConSaldo: number;
    saldosPendientes: number;
    trabajadoresConDeuda: number;
  };
}

export interface FinanzasPorPeriodo {
  periodo: string;
  ingresos: number;
  comision: number;
  personal: number;
  recibidoPlataforma: number;
  efectivo: number;
  cantidad: number;
}

export interface FinanzasPorServicio {
  servicio: string;
  ingresos: number;
  comision: number;
  personal: number;
  cantidad: number;
}

export interface LiquidacionesPorPeriodo {
  periodo: string;
  pagado: number;
  pendiente: number;
  cantidad: number;
}

export interface MovimientoFlujo {
  id: string;
  tipo: 'INGRESO' | 'EGRESO';
  fecha: string;
  concepto: string;
  referencia: string;
  metodo: MetodoPago | null;
  estado: EstadoPago | EstadoLiquidacion;
  monto: number;
  comision: number | null;
  recibidoPorPlataforma: boolean;
  detalle: string;
  cliente: Usuario | null;
  personal: Usuario | null;
  solicitudId: string | null;
}

export interface FlujoFinanciero {
  totales: { ingresosPlataforma: number; efectivoPersonal: number; egresos: number; neto: number };
  movimientos: MovimientoFlujo[];
}
