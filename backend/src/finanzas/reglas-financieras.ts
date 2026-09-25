import { randomBytes } from 'crypto';
import { MetodoPago, TipoMovimientoWallet } from '@prisma/client';

/**
 * Reglas financieras centralizadas de ServiClean.
 *
 * - ServiClean cobra una comisión sobre cada servicio (por defecto 20 %).
 * - El personal de aseo recibe el resto (por defecto 80 %).
 * - El porcentaje se puede cambiar con la variable de entorno COMISION_SERVICLEAN_PORCENTAJE,
 *   sin tocar el código. Cada pago guarda una copia de la distribución con la que se calculó.
 *
 * IMPORTANTE: los pagos con tarjeta son SIMULADOS (proyecto académico). No existe integración
 * con bancos ni pasarelas de pago y nunca se procesa ni almacena información sensible de tarjetas.
 */

export const PORCENTAJE_COMISION_POR_DEFECTO = 20;

/** Métodos que un cliente puede elegir actualmente. TRANSFERENCIA y NEQUI existen solo en pagos históricos. */
export const METODOS_PAGO_VIGENTES = [MetodoPago.SIMULADO_TARJETA, MetodoPago.EFECTIVO] as const;
export type MetodoPagoVigente = (typeof METODOS_PAGO_VIGENTES)[number];

export const MARCAS_TARJETA = ['VISA', 'MASTERCARD', 'AMEX', 'DINERS', 'OTRA'] as const;

export function porcentajeComisionServiClean(): number {
  const configurado = process.env.COMISION_SERVICLEAN_PORCENTAJE;
  if (configurado === undefined || configurado.trim() === '') return PORCENTAJE_COMISION_POR_DEFECTO;
  const porcentaje = Number(configurado);
  if (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 100) {
    throw new Error('COMISION_SERVICLEAN_PORCENTAJE debe ser un número entre 0 y 100.');
  }
  return porcentaje;
}

export interface DistribucionPago {
  porcentajeComision: number;
  porcentajePersonal: number;
  montoCentavos: number;
  comisionCentavos: number;
  personalCentavos: number;
}

/** Reparte el valor de un servicio entre ServiClean y el personal. comisión + personal = monto, siempre. */
export function calcularDistribucion(montoCentavos: number, porcentajeComision = porcentajeComisionServiClean()): DistribucionPago {
  if (!Number.isSafeInteger(montoCentavos) || montoCentavos <= 0) {
    throw new Error('El monto del servicio debe ser un entero positivo en centavos.');
  }
  const comisionCentavos = Math.round((montoCentavos * porcentajeComision) / 100);
  return {
    porcentajeComision,
    porcentajePersonal: 100 - porcentajeComision,
    montoCentavos,
    comisionCentavos,
    personalCentavos: montoCentavos - comisionCentavos,
  };
}

/** En efectivo el dinero lo recibe el trabajador; en los demás métodos lo recibe la plataforma. */
export function esRecibidoPorPlataforma(metodo: MetodoPago): boolean {
  return metodo !== MetodoPago.EFECTIVO;
}

export interface EfectoWallet {
  tipo: TipoMovimientoWallet;
  montoCentavos: number;
  sufijoClave: 'INGRESO' | 'EFECTIVO';
}

/**
 * Movimientos que genera en la wallet del trabajador un servicio pagado y finalizado.
 *
 * - Tarjeta: +parte del personal. ServiClean tiene el dinero y se lo debe al trabajador.
 * - Efectivo: +parte del personal y −valor total recibido en efectivo.
 *   Resultado neto: −comisión. El trabajador ya tiene en sus manos su parte (y la de ServiClean),
 *   así que ServiClean no le vuelve a pagar y la comisión queda como saldo pendiente, que se
 *   compensa automáticamente con los siguientes servicios pagados con tarjeta.
 */
export function efectosEnWallet(metodo: MetodoPago, distribucion: DistribucionPago): EfectoWallet[] {
  const efectos: EfectoWallet[] = [
    { tipo: TipoMovimientoWallet.INGRESO_SERVICIO, montoCentavos: distribucion.personalCentavos, sufijoClave: 'INGRESO' },
  ];
  if (!esRecibidoPorPlataforma(metodo)) {
    efectos.push({ tipo: TipoMovimientoWallet.PAGO_EFECTIVO, montoCentavos: -distribucion.montoCentavos, sufijoClave: 'EFECTIVO' });
  }
  return efectos;
}

/** Signo obligatorio de cada tipo de movimiento (0 = puede ser positivo o negativo). */
export const SIGNO_MOVIMIENTO: Record<TipoMovimientoWallet, 1 | -1 | 0> = {
  INGRESO_SERVICIO: 1,
  PAGO_EFECTIVO: -1,
  BONIFICACION: 1,
  DESCUENTO: -1,
  AJUSTE: 0,
  LIQUIDACION: -1,
};

export interface DesgloseLiquidacion {
  saldoInicialCentavos: number;
  ingresosCentavos: number;
  descuentosCentavos: number;
  ajustesCentavos: number;
  totalCentavos: number;
}

/** total = saldo inicial + ingresos − descuentos + ajustes (las liquidaciones delimitan el periodo). */
export function calcularDesgloseLiquidacion(
  saldoInicialCentavos: number,
  movimientos: { tipo: TipoMovimientoWallet; montoCentavos: number }[],
): DesgloseLiquidacion {
  let ingresosCentavos = 0;
  let descuentosCentavos = 0;
  let ajustesCentavos = 0;
  for (const { tipo, montoCentavos } of movimientos) {
    if (tipo === 'INGRESO_SERVICIO' || tipo === 'BONIFICACION') ingresosCentavos += montoCentavos;
    else if (tipo === 'PAGO_EFECTIVO' || tipo === 'DESCUENTO') descuentosCentavos += -montoCentavos;
    else ajustesCentavos += montoCentavos;
  }
  return {
    saldoInicialCentavos,
    ingresosCentavos,
    descuentosCentavos,
    ajustesCentavos,
    totalCentavos: saldoInicialCentavos + ingresosCentavos - descuentosCentavos + ajustesCentavos,
  };
}

/** Referencia única y legible de un pago: PAY-XXXXXXXXXX. */
export function generarReferenciaPago(): string {
  return `PAY-${randomBytes(5).toString('hex').toUpperCase()}`;
}

/** Referencia corta de un servicio para mostrar en conceptos: "#3F2A91". */
export function referenciaServicio(solicitudId: string): string {
  return `#${solicitudId.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

export function referenciaLiquidacion(numero: number): string {
  return `L-${String(numero).padStart(4, '0')}`;
}

export const TEXTO_METODO: Record<MetodoPago, string> = {
  SIMULADO_TARJETA: 'tarjeta simulada',
  EFECTIVO: 'efectivo',
  TRANSFERENCIA: 'transferencia',
  NEQUI: 'Nequi',
};

/** Convierte "AAAA-MM-DD" en un rango [desde, hasta) en hora de Colombia (UTC−5). */
export function rangoFechas(desde?: string, hasta?: string): { gte?: Date; lt?: Date } | undefined {
  if (!desde && !hasta) return undefined;
  const rango: { gte?: Date; lt?: Date } = {};
  if (desde) rango.gte = new Date(`${desde.slice(0, 10)}T00:00:00-05:00`);
  if (hasta) {
    const fin = new Date(`${hasta.slice(0, 10)}T00:00:00-05:00`);
    fin.setUTCDate(fin.getUTCDate() + 1);
    rango.lt = fin;
  }
  return rango;
}
