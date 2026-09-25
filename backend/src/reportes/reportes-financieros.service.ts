import { Injectable } from '@nestjs/common';
import { MetodoPago, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { SELECCION_USUARIO_PUBLICO } from '../comun/selecciones';
import { aCentavos, aPesos } from '../finanzas/dinero';
import {
  calcularDistribucion,
  esRecibidoPorPlataforma,
  porcentajeComisionServiClean,
  rangoFechas,
  referenciaLiquidacion,
  referenciaServicio,
  TEXTO_METODO,
} from '../finanzas/reglas-financieras';
import { FiltrosFinancierosDto, FiltrosFlujoDto } from './dto/filtros-financieros.dto';

interface PagoConDistribucion {
  montoCentavos: number;
  comisionCentavos: number;
  personalCentavos: number;
  metodo: MetodoPago;
  fecha: Date;
  servicio: string;
}

/** Desfase de Colombia (UTC−5) para agrupar por día, semana o mes locales. */
const DESFASE_COLOMBIA_MS = 5 * 60 * 60 * 1000;

function clavePeriodo(fecha: Date, agrupacion: 'mes' | 'semana'): string {
  const local = new Date(fecha.getTime() - DESFASE_COLOMBIA_MS);
  if (agrupacion === 'mes') return local.toISOString().slice(0, 7);
  // Semana: fecha del lunes correspondiente.
  const dia = (local.getUTCDay() + 6) % 7;
  local.setUTCDate(local.getUTCDate() - dia);
  return local.toISOString().slice(0, 10);
}

/**
 * Reportes financieros. Diferencia siempre:
 *  - dinero recibido por la plataforma (tarjeta simulada y métodos históricos),
 *  - dinero entregado directamente en efectivo al personal,
 *  - comisión / ingreso de ServiClean,
 *  - dinero correspondiente al personal.
 */
@Injectable()
export class ReportesFinancierosService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
  ) {}

  private async pagosPagados(filtros: FiltrosFinancierosDto): Promise<PagoConDistribucion[]> {
    const rango = rangoFechas(filtros.desde, filtros.hasta);
    const pagos = await this.prisma.pago.findMany({
      where: { estado: 'PAGADO', ...(rango ? { fecha: rango } : {}) },
      include: { solicitud: { select: { servicio: { select: { nombre: true } } } } },
    });
    return pagos.map((pago) => {
      const montoCentavos = aCentavos(pago.monto);
      // Los pagos guardan su distribución; los históricos sin ella se calculan con la configuración actual.
      const distribucion =
        pago.montoComision !== null && pago.montoPersonal !== null
          ? { comisionCentavos: aCentavos(pago.montoComision), personalCentavos: aCentavos(pago.montoPersonal) }
          : calcularDistribucion(montoCentavos);
      return {
        montoCentavos,
        comisionCentavos: distribucion.comisionCentavos,
        personalCentavos: distribucion.personalCentavos,
        metodo: pago.metodo,
        fecha: pago.fecha,
        servicio: pago.solicitud.servicio.nombre,
      };
    });
  }

  async resumen(filtros: FiltrosFinancierosDto = {}) {
    const rango = rangoFechas(filtros.desde, filtros.hasta);
    const [pagos, liquidacionesPagadas, liquidacionesPendientes, wallets, reembolsos] = await Promise.all([
      this.pagosPagados(filtros),
      this.prisma.liquidacion.findMany({ where: { estado: 'PAGADA', ...(rango ? { fechaPago: rango } : {}) }, select: { monto: true } }),
      this.prisma.liquidacion.findMany({ where: { estado: 'PENDIENTE' }, select: { monto: true } }),
      this.prisma.wallet.findMany({ select: { saldo: true } }),
      this.prisma.pago.findMany({ where: { estado: 'REEMBOLSADO', ...(rango ? { fecha: rango } : {}) }, select: { monto: true } }),
    ]);

    const sumar = (lista: PagoConDistribucion[], campo: keyof Pick<PagoConDistribucion, 'montoCentavos' | 'comisionCentavos' | 'personalCentavos'>) =>
      lista.reduce((total, pago) => total + pago[campo], 0);
    const tarjeta = pagos.filter((pago) => pago.metodo === 'SIMULADO_TARJETA');
    const otrosDigitales = pagos.filter((pago) => esRecibidoPorPlataforma(pago.metodo) && pago.metodo !== 'SIMULADO_TARJETA');
    const efectivo = pagos.filter((pago) => !esRecibidoPorPlataforma(pago.metodo));
    const recibidoPlataforma = sumar(tarjeta, 'montoCentavos') + sumar(otrosDigitales, 'montoCentavos');
    const liquidado = liquidacionesPagadas.reduce((total, l) => total + aCentavos(l.monto), 0);
    const saldos = wallets.map((wallet) => aCentavos(wallet.saldo));

    return {
      periodo: { desde: filtros.desde ?? null, hasta: filtros.hasta ?? null },
      porcentajeComision: porcentajeComisionServiClean(),
      servicios: {
        ingresosBrutos: aPesos(sumar(pagos, 'montoCentavos')),
        cantidadPagos: pagos.length,
      },
      plataforma: {
        recibido: aPesos(recibidoPlataforma),
        tarjetaSimulada: aPesos(sumar(tarjeta, 'montoCentavos')),
        cantidadTarjeta: tarjeta.length,
        otrosMetodos: aPesos(sumar(otrosDigitales, 'montoCentavos')),
        cantidadOtrosMetodos: otrosDigitales.length,
        reembolsado: aPesos(reembolsos.reduce((total, pago) => total + aCentavos(pago.monto), 0)),
        // Dinero de la plataforma que aún no ha salido hacia el personal.
        caja: aPesos(recibidoPlataforma - liquidado),
      },
      efectivo: {
        entregadoAlPersonal: aPesos(sumar(efectivo, 'montoCentavos')),
        cantidad: efectivo.length,
        comisionPorCobrar: aPesos(sumar(efectivo, 'comisionCentavos')),
      },
      serviclean: {
        comision: aPesos(sumar(pagos, 'comisionCentavos')),
        comisionTarjeta: aPesos(sumar(tarjeta, 'comisionCentavos') + sumar(otrosDigitales, 'comisionCentavos')),
        comisionEfectivo: aPesos(sumar(efectivo, 'comisionCentavos')),
      },
      personal: {
        generado: aPesos(sumar(pagos, 'personalCentavos')),
        liquidado: aPesos(liquidado),
        cantidadLiquidaciones: liquidacionesPagadas.length,
        liquidacionesPendientes: aPesos(liquidacionesPendientes.reduce((total, l) => total + aCentavos(l.monto), 0)),
        cantidadLiquidacionesPendientes: liquidacionesPendientes.length,
        // Saldos actuales (no dependen del periodo consultado).
        saldoPorLiquidar: aPesos(saldos.filter((s) => s > 0).reduce((a, b) => a + b, 0)),
        trabajadoresConSaldo: saldos.filter((s) => s > 0).length,
        saldosPendientes: aPesos(-saldos.filter((s) => s < 0).reduce((a, b) => a + b, 0)),
        trabajadoresConDeuda: saldos.filter((s) => s < 0).length,
      },
    };
  }

  async porPeriodo(filtros: FiltrosFinancierosDto = {}) {
    const agrupacion = filtros.agrupacion ?? 'mes';
    const pagos = await this.pagosPagados(filtros);
    const periodos = new Map<string, { ingresos: number; comision: number; personal: number; tarjeta: number; efectivo: number; cantidad: number }>();
    for (const pago of pagos) {
      const clave = clavePeriodo(pago.fecha, agrupacion);
      const actual = periodos.get(clave) ?? { ingresos: 0, comision: 0, personal: 0, tarjeta: 0, efectivo: 0, cantidad: 0 };
      actual.ingresos += pago.montoCentavos;
      actual.comision += pago.comisionCentavos;
      actual.personal += pago.personalCentavos;
      if (esRecibidoPorPlataforma(pago.metodo)) actual.tarjeta += pago.montoCentavos;
      else actual.efectivo += pago.montoCentavos;
      actual.cantidad += 1;
      periodos.set(clave, actual);
    }
    return [...periodos.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([periodo, valores]) => ({
        periodo,
        ingresos: aPesos(valores.ingresos),
        comision: aPesos(valores.comision),
        personal: aPesos(valores.personal),
        recibidoPlataforma: aPesos(valores.tarjeta),
        efectivo: aPesos(valores.efectivo),
        cantidad: valores.cantidad,
      }));
  }

  async porServicio(filtros: FiltrosFinancierosDto = {}) {
    const pagos = await this.pagosPagados(filtros);
    const servicios = new Map<string, { ingresos: number; comision: number; personal: number; cantidad: number }>();
    for (const pago of pagos) {
      const actual = servicios.get(pago.servicio) ?? { ingresos: 0, comision: 0, personal: 0, cantidad: 0 };
      actual.ingresos += pago.montoCentavos;
      actual.comision += pago.comisionCentavos;
      actual.personal += pago.personalCentavos;
      actual.cantidad += 1;
      servicios.set(pago.servicio, actual);
    }
    return [...servicios.entries()]
      .map(([servicio, valores]) => ({
        servicio,
        ingresos: aPesos(valores.ingresos),
        comision: aPesos(valores.comision),
        personal: aPesos(valores.personal),
        cantidad: valores.cantidad,
      }))
      .sort((a, b) => b.comision - a.comision);
  }

  /** Dinero generado, efectivo recibido, saldo y liquidado por cada trabajador. */
  personal() {
    return this.walletService.listarWallets();
  }

  async liquidacionesPorPeriodo(filtros: FiltrosFinancierosDto = {}) {
    const agrupacion = filtros.agrupacion ?? 'mes';
    const rango = rangoFechas(filtros.desde, filtros.hasta);
    const liquidaciones = await this.prisma.liquidacion.findMany({
      where: { estado: { not: 'CANCELADA' }, ...(rango ? { fechaCreacion: rango } : {}) },
      select: { estado: true, monto: true, fechaCreacion: true },
    });
    const periodos = new Map<string, { pagado: number; pendiente: number; cantidad: number }>();
    for (const liquidacion of liquidaciones) {
      const clave = clavePeriodo(liquidacion.fechaCreacion, agrupacion);
      const actual = periodos.get(clave) ?? { pagado: 0, pendiente: 0, cantidad: 0 };
      if (liquidacion.estado === 'PAGADA') actual.pagado += aCentavos(liquidacion.monto);
      else actual.pendiente += aCentavos(liquidacion.monto);
      actual.cantidad += 1;
      periodos.set(clave, actual);
    }
    return [...periodos.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([periodo, valores]) => ({ periodo, pagado: aPesos(valores.pagado), pendiente: aPesos(valores.pendiente), cantidad: valores.cantidad }));
  }

  /**
   * Flujo de dinero: INGRESOS = pagos de servicios (los de efectivo se marcan como cobrados por el personal),
   * EGRESOS = liquidaciones pagadas (o pendientes, si se filtra por ese estado) al personal.
   */
  async flujo(filtros: FiltrosFlujoDto = {}) {
    const rango = rangoFechas(filtros.desde, filtros.hasta);
    const incluirIngresos = filtros.tipo !== 'EGRESO' && !(filtros.estado && ['PAGADA', 'CANCELADA'].includes(filtros.estado));
    const incluirEgresos = filtros.tipo !== 'INGRESO' && !filtros.metodo && !filtros.solicitudId;

    const estadoPago: Prisma.PagoWhereInput['estado'] =
      filtros.estado && ['PENDIENTE', 'PAGADO', 'CANCELADO', 'REEMBOLSADO'].includes(filtros.estado)
        ? (filtros.estado as Prisma.PagoWhereInput['estado'])
        : filtros.estado
          ? undefined
          : { in: ['PAGADO', 'REEMBOLSADO'] };
    const estadoLiquidacion: Prisma.LiquidacionWhereInput['estado'] =
      filtros.estado === 'PENDIENTE' || filtros.estado === 'PAGADA' || filtros.estado === 'CANCELADA' ? filtros.estado : filtros.estado ? undefined : 'PAGADA';

    const [pagos, liquidaciones] = await Promise.all([
      incluirIngresos
        ? this.prisma.pago.findMany({
            where: {
              estado: estadoPago,
              ...(filtros.metodo ? { metodo: filtros.metodo } : {}),
              ...(filtros.solicitudId ? { solicitudId: filtros.solicitudId } : {}),
              ...(filtros.personalId ? { solicitud: { asignacion: { personalId: filtros.personalId } } } : {}),
              ...(rango ? { fecha: rango } : {}),
            },
            include: {
              cliente: { select: SELECCION_USUARIO_PUBLICO },
              solicitud: { select: { id: true, servicio: { select: { nombre: true } }, asignacion: { select: { personal: { select: SELECCION_USUARIO_PUBLICO } } } } },
            },
          })
        : [],
      incluirEgresos
        ? this.prisma.liquidacion.findMany({
            where: {
              estado: estadoLiquidacion,
              ...(filtros.personalId ? { wallet: { personalId: filtros.personalId } } : {}),
              ...(rango ? { OR: [{ fechaPago: rango }, { fechaPago: null, fechaCreacion: rango }] } : {}),
            },
            include: { wallet: { select: { personal: { select: SELECCION_USUARIO_PUBLICO } } } },
          })
        : [],
    ]);

    const movimientos = [
      ...pagos.map((pago) => ({
        id: pago.id,
        tipo: 'INGRESO' as const,
        fecha: pago.fecha,
        concepto: `Pago de servicio ${referenciaServicio(pago.solicitudId)} · ${pago.solicitud.servicio.nombre}`,
        referencia: pago.referencia,
        metodo: pago.metodo,
        estado: pago.estado,
        monto: aPesos(aCentavos(pago.monto)),
        comision: pago.montoComision !== null ? aPesos(aCentavos(pago.montoComision)) : null,
        recibidoPorPlataforma: esRecibidoPorPlataforma(pago.metodo),
        detalle: esRecibidoPorPlataforma(pago.metodo)
          ? `Recibido por ServiClean (${TEXTO_METODO[pago.metodo]})`
          : 'Cobrado en efectivo por el personal de aseo',
        cliente: pago.cliente,
        personal: pago.solicitud.asignacion?.personal ?? null,
        solicitudId: pago.solicitudId,
      })),
      ...liquidaciones.map((liquidacion) => ({
        id: liquidacion.id,
        tipo: 'EGRESO' as const,
        fecha: liquidacion.fechaPago ?? liquidacion.fechaCreacion,
        concepto: `Liquidación ${referenciaLiquidacion(liquidacion.numero)} · ${liquidacion.wallet.personal.nombre} ${liquidacion.wallet.personal.apellido}`,
        referencia: referenciaLiquidacion(liquidacion.numero),
        metodo: null,
        estado: liquidacion.estado,
        monto: -aPesos(aCentavos(liquidacion.monto)),
        comision: null,
        recibidoPorPlataforma: true,
        detalle: 'Pago de ServiClean al personal',
        cliente: null,
        personal: liquidacion.wallet.personal,
        solicitudId: null,
      })),
    ].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

    const ingresosPlataforma = movimientos
      .filter((m) => m.tipo === 'INGRESO' && m.recibidoPorPlataforma && m.estado === 'PAGADO')
      .reduce((total, m) => total + m.monto, 0);
    const efectivo = movimientos
      .filter((m) => m.tipo === 'INGRESO' && !m.recibidoPorPlataforma && m.estado === 'PAGADO')
      .reduce((total, m) => total + m.monto, 0);
    const egresos = movimientos.filter((m) => m.tipo === 'EGRESO' && m.estado === 'PAGADA').reduce((total, m) => total - m.monto, 0);

    return {
      totales: {
        ingresosPlataforma: Math.round(ingresosPlataforma * 100) / 100,
        efectivoPersonal: Math.round(efectivo * 100) / 100,
        egresos: Math.round(egresos * 100) / 100,
        neto: Math.round((ingresosPlataforma - egresos) * 100) / 100,
      },
      movimientos,
    };
  }
}
