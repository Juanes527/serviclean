import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MovimientoWallet, Prisma, TipoMovimientoWallet } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { SELECCION_USUARIO_PUBLICO } from '../comun/selecciones';
import { aCentavos, aDecimal, aPesos, formatearPesos } from '../finanzas/dinero';
import {
  calcularDistribucion,
  DistribucionPago,
  efectosEnWallet,
  rangoFechas,
  referenciaServicio,
  SIGNO_MOVIMIENTO,
  TEXTO_METODO,
} from '../finanzas/reglas-financieras';
import { CrearAjusteDto } from './dto/crear-ajuste.dto';
import { FiltrosMovimientosDto } from './dto/filtros-movimientos.dto';

type ClienteBD = Prisma.TransactionClient | PrismaService;

export interface DatosMovimiento {
  personalId: string;
  tipo: TipoMovimientoWallet;
  montoCentavos: number;
  concepto: string;
  solicitudId?: string;
  pagoId?: string;
  liquidacionId?: string;
  autorizadoPorId?: string;
  claveIdempotencia?: string;
  metadata?: Prisma.InputJsonValue;
}

const INCLUIR_MOVIMIENTO = {
  solicitud: { select: { id: true, fecha: true, servicio: { select: { nombre: true } } } },
  pago: { select: { referencia: true, metodo: true } },
  liquidacion: { select: { id: true, numero: true } },
  autorizadoPor: { select: { nombre: true, apellido: true } },
} satisfies Prisma.MovimientoWalletInclude;

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private notificacionesService: NotificacionesService,
  ) {}

  async obtenerOCrear(personalId: string, cliente: ClienteBD = this.prisma) {
    return cliente.wallet.upsert({ where: { personalId }, update: {}, create: { personalId } });
  }

  /**
   * Bloquea la wallet hasta que termine la transacción (SELECT … FOR UPDATE).
   * Serializa los cambios de saldo de un mismo trabajador y evita condiciones de carrera.
   */
  async bloquear(tx: Prisma.TransactionClient, walletId: string) {
    await tx.$queryRaw`SELECT "id" FROM "wallets" WHERE "id" = ${walletId} FOR UPDATE`;
    return tx.wallet.findUniqueOrThrow({ where: { id: walletId } });
  }

  /**
   * ÚNICO punto del sistema que modifica un saldo. Debe ejecutarse dentro de una transacción:
   * crea el movimiento inmutable (con saldo anterior y posterior) y actualiza el acumulado de la wallet.
   * Si ya existe un movimiento con la misma clave de idempotencia, lo devuelve sin duplicarlo.
   */
  async registrarMovimiento(tx: Prisma.TransactionClient, datos: DatosMovimiento): Promise<MovimientoWallet> {
    const { montoCentavos, tipo } = datos;
    if (!Number.isSafeInteger(montoCentavos) || montoCentavos === 0) {
      throw new BadRequestException('El monto del movimiento debe ser distinto de cero.');
    }
    const signo = SIGNO_MOVIMIENTO[tipo];
    if (signo !== 0 && Math.sign(montoCentavos) !== signo) {
      throw new BadRequestException(`El monto de un movimiento ${tipo} debe ser ${signo > 0 ? 'positivo' : 'negativo'}.`);
    }

    const wallet = await this.obtenerOCrear(datos.personalId, tx);
    const bloqueada = await this.bloquear(tx, wallet.id);

    // La verificación se hace después del bloqueo: una petición concurrente ya habrá confirmado su movimiento.
    if (datos.claveIdempotencia) {
      const existente = await tx.movimientoWallet.findUnique({ where: { claveIdempotencia: datos.claveIdempotencia } });
      if (existente) return existente;
    }

    const saldoAnterior = aCentavos(bloqueada.saldo);
    const saldoPosterior = saldoAnterior + montoCentavos;

    const movimiento = await tx.movimientoWallet.create({
      data: {
        walletId: wallet.id,
        tipo,
        concepto: datos.concepto,
        monto: aDecimal(montoCentavos),
        saldoAnterior: aDecimal(saldoAnterior),
        saldoPosterior: aDecimal(saldoPosterior),
        solicitudId: datos.solicitudId,
        pagoId: datos.pagoId,
        liquidacionId: datos.liquidacionId,
        autorizadoPorId: datos.autorizadoPorId,
        claveIdempotencia: datos.claveIdempotencia,
        metadata: datos.metadata,
      },
    });
    await tx.wallet.update({ where: { id: wallet.id }, data: { saldo: aDecimal(saldoPosterior) } });
    return movimiento;
  }

  /**
   * Refleja en la wallet del trabajador un servicio que está FINALIZADO y PAGADO.
   * Se invoca al pagar y al finalizar: el efecto se aplica cuando se cumplen ambas condiciones
   * (así una reasignación o una cancelación previa nunca acreditan a la persona equivocada).
   * Es idempotente: las claves "PAGO:<id>:INGRESO" y "PAGO:<id>:EFECTIVO" impiden duplicados.
   */
  async aplicarPagoDeSolicitud(tx: Prisma.TransactionClient, solicitudId: string): Promise<MovimientoWallet[]> {
    const solicitud = await tx.solicitud.findUnique({
      where: { id: solicitudId },
      include: { pago: true, asignacion: true, servicio: { select: { nombre: true } } },
    });
    const pago = solicitud?.pago;
    if (!solicitud || solicitud.estado !== 'FINALIZADO' || !pago || pago.estado !== 'PAGADO' || !solicitud.asignacion) {
      return [];
    }

    let distribucion: DistribucionPago;
    if (pago.porcentajeComision !== null && pago.montoComision !== null && pago.montoPersonal !== null) {
      const porcentajeComision = Number(pago.porcentajeComision);
      distribucion = {
        porcentajeComision,
        porcentajePersonal: 100 - porcentajeComision,
        montoCentavos: aCentavos(pago.monto),
        comisionCentavos: aCentavos(pago.montoComision),
        personalCentavos: aCentavos(pago.montoPersonal),
      };
    } else {
      // Pagos históricos sin distribución guardada: se calcula ahora y se deja registrada.
      distribucion = calcularDistribucion(aCentavos(pago.monto));
      await tx.pago.update({
        where: { id: pago.id },
        data: {
          porcentajeComision: distribucion.porcentajeComision,
          montoComision: aDecimal(distribucion.comisionCentavos),
          montoPersonal: aDecimal(distribucion.personalCentavos),
        },
      });
    }

    const referencia = referenciaServicio(solicitud.id);
    const metadata = {
      metodo: pago.metodo,
      referenciaPago: pago.referencia,
      montoServicio: aPesos(distribucion.montoCentavos),
      porcentajeComision: distribucion.porcentajeComision,
      comisionServiClean: aPesos(distribucion.comisionCentavos),
      partePersonal: aPesos(distribucion.personalCentavos),
    };
    const conceptos: Record<string, string> = {
      INGRESO: `Servicio ${referencia} · ${solicitud.servicio.nombre} (${TEXTO_METODO[pago.metodo]})`,
      EFECTIVO: `Efectivo recibido del cliente · servicio ${referencia}`,
    };

    const movimientos: MovimientoWallet[] = [];
    for (const efecto of efectosEnWallet(pago.metodo, distribucion)) {
      movimientos.push(
        await this.registrarMovimiento(tx, {
          personalId: solicitud.asignacion.personalId,
          tipo: efecto.tipo,
          montoCentavos: efecto.montoCentavos,
          concepto: conceptos[efecto.sufijoClave],
          solicitudId: solicitud.id,
          pagoId: pago.id,
          claveIdempotencia: `PAGO:${pago.id}:${efecto.sufijoClave}`,
          metadata,
        }),
      );
    }
    return movimientos;
  }

  /** Avisa al trabajador del efecto neto de un servicio en su wallet (fuera de la transacción). */
  async notificarEfectoServicio(personalId: string, movimientos: MovimientoWallet[]) {
    if (movimientos.length === 0) return;
    const neto = movimientos.reduce((suma, movimiento) => suma + aCentavos(movimiento.monto), 0);
    const mensaje =
      neto >= 0
        ? `Se acreditaron ${formatearPesos(neto)} a tu wallet por un servicio finalizado.`
        : `Registramos un servicio cobrado en efectivo: la comisión de ${formatearPesos(-neto)} se descontará de tus próximos servicios.`;
    await this.notificacionesService.crear(personalId, mensaje);
  }

  async existenMovimientosDeSolicitud(solicitudId: string, cliente: ClienteBD = this.prisma) {
    return (await cliente.movimientoWallet.count({ where: { solicitudId } })) > 0;
  }

  // ─── Consultas ────────────────────────────────────────────────────────────────

  async resumen(personalId: string) {
    const personal = await this.prisma.usuario.findUnique({ where: { id: personalId }, select: SELECCION_USUARIO_PUBLICO });
    if (!personal || personal.rol !== 'PERSONAL_ASEO') {
      throw new NotFoundException('Integrante del personal de aseo no encontrado.');
    }
    const wallet = await this.obtenerOCrear(personalId);
    const [movimientos, liquidacionPendiente] = await Promise.all([
      this.prisma.movimientoWallet.findMany({
        where: { walletId: wallet.id },
        select: { tipo: true, monto: true, pago: { select: { metodo: true } } },
      }),
      this.prisma.liquidacion.findFirst({ where: { walletId: wallet.id, estado: 'PENDIENTE' } }),
    ]);
    return {
      personal,
      walletId: wallet.id,
      ...this.totalizar(aCentavos(wallet.saldo), movimientos),
      liquidacionPendiente,
    };
  }

  /** Resumen de todas las wallets del personal (panel administrativo y reportes). */
  async listarWallets() {
    const [personal, movimientos, pendientes] = await Promise.all([
      this.prisma.usuario.findMany({
        where: { rol: 'PERSONAL_ASEO' },
        select: { ...SELECCION_USUARIO_PUBLICO, wallet: true },
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.movimientoWallet.findMany({
        select: { walletId: true, tipo: true, monto: true, pago: { select: { metodo: true } } },
      }),
      this.prisma.liquidacion.findMany({ where: { estado: 'PENDIENTE' }, select: { walletId: true, monto: true, numero: true, id: true } }),
    ]);

    return personal.map(({ wallet, ...usuario }) => {
      const propios = wallet ? movimientos.filter((movimiento) => movimiento.walletId === wallet.id) : [];
      return {
        personal: usuario,
        walletId: wallet?.id ?? null,
        ...this.totalizar(aCentavos(wallet?.saldo), propios),
        liquidacionPendiente: wallet ? (pendientes.find((liquidacion) => liquidacion.walletId === wallet.id) ?? null) : null,
      };
    });
  }

  private totalizar(
    saldoCentavos: number,
    movimientos: { tipo: TipoMovimientoWallet; monto: Prisma.Decimal; pago: { metodo: string } | null }[],
  ) {
    const suma = (filtro: (movimiento: (typeof movimientos)[number]) => boolean) =>
      movimientos.filter(filtro).reduce((total, movimiento) => total + aCentavos(movimiento.monto), 0);

    const generado = suma((m) => m.tipo === 'INGRESO_SERVICIO');
    const generadoEfectivo = suma((m) => m.tipo === 'INGRESO_SERVICIO' && m.pago?.metodo === 'EFECTIVO');
    return {
      saldo: aPesos(saldoCentavos),
      saldoDisponible: aPesos(Math.max(saldoCentavos, 0)),
      saldoPendiente: aPesos(Math.max(-saldoCentavos, 0)),
      totalGenerado: aPesos(generado),
      generadoTarjeta: aPesos(generado - generadoEfectivo),
      generadoEfectivo: aPesos(generadoEfectivo),
      efectivoRecibido: aPesos(-suma((m) => m.tipo === 'PAGO_EFECTIVO')),
      bonificaciones: aPesos(suma((m) => m.tipo === 'BONIFICACION')),
      descuentos: aPesos(-suma((m) => m.tipo === 'DESCUENTO')),
      ajustes: aPesos(suma((m) => m.tipo === 'AJUSTE')),
      totalLiquidado: aPesos(-suma((m) => m.tipo === 'LIQUIDACION')),
      serviciosLiquidados: movimientos.filter((m) => m.tipo === 'INGRESO_SERVICIO').length,
    };
  }

  async movimientosDePersonal(personalId: string, filtros: FiltrosMovimientosDto = {}) {
    const wallet = await this.obtenerOCrear(personalId);
    return this.prisma.movimientoWallet.findMany({
      where: { walletId: wallet.id, ...this.condiciones(filtros) },
      include: INCLUIR_MOVIMIENTO,
      orderBy: { numero: 'desc' },
    });
  }

  async movimientosGenerales(filtros: FiltrosMovimientosDto = {}) {
    return this.prisma.movimientoWallet.findMany({
      where: {
        ...this.condiciones(filtros),
        ...(filtros.personalId ? { wallet: { personalId: filtros.personalId } } : {}),
      },
      include: { ...INCLUIR_MOVIMIENTO, wallet: { select: { personal: { select: SELECCION_USUARIO_PUBLICO } } } },
      orderBy: { numero: 'desc' },
      take: 500,
    });
  }

  private condiciones(filtros: FiltrosMovimientosDto): Prisma.MovimientoWalletWhereInput {
    return {
      ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
      ...(filtros.solicitudId ? { solicitudId: filtros.solicitudId } : {}),
      ...(rangoFechas(filtros.desde, filtros.hasta) ? { fecha: rangoFechas(filtros.desde, filtros.hasta) } : {}),
    };
  }

  /** Ajuste autorizado por el administrador (bonificación, descuento o corrección). */
  async crearAjuste(administradorId: string, personalId: string, datos: CrearAjusteDto) {
    const personal = await this.prisma.usuario.findUnique({ where: { id: personalId } });
    if (!personal || personal.rol !== 'PERSONAL_ASEO') {
      throw new NotFoundException('Integrante del personal de aseo no encontrado.');
    }

    const magnitud = aCentavos(datos.monto);
    const montoCentavos =
      datos.tipo === 'BONIFICACION' ? Math.abs(magnitud) : datos.tipo === 'DESCUENTO' ? -Math.abs(magnitud) : magnitud;

    const movimiento = await this.prisma.$transaction((tx) =>
      this.registrarMovimiento(tx, {
        personalId,
        tipo: datos.tipo,
        montoCentavos,
        concepto: datos.concepto.trim(),
        autorizadoPorId: administradorId,
        claveIdempotencia: datos.claveIdempotencia ? `AJUSTE:${datos.claveIdempotencia}` : undefined,
      }),
    );

    await this.notificacionesService.crear(
      personalId,
      `Se registró un ${datos.tipo.toLowerCase()} de ${formatearPesos(montoCentavos)} en tu wallet: ${datos.concepto.trim()}.`,
    );
    return movimiento;
  }
}
