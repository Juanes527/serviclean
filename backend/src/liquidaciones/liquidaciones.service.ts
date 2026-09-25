import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Wallet } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { WalletService } from '../wallet/wallet.service';
import { UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';
import { SELECCION_USUARIO_PUBLICO } from '../comun/selecciones';
import { aCentavos, aDecimal, aPesos, formatearPesos } from '../finanzas/dinero';
import { calcularDesgloseLiquidacion, rangoFechas, referenciaLiquidacion } from '../finanzas/reglas-financieras';
import { CrearLiquidacionDto } from './dto/crear-liquidacion.dto';
import { FiltrosLiquidacionesDto } from './dto/filtros-liquidaciones.dto';

type ClienteBD = Prisma.TransactionClient | PrismaService;

const INCLUIR_LIQUIDACION = {
  wallet: { select: { personalId: true, personal: { select: SELECCION_USUARIO_PUBLICO } } },
  creadaPor: { select: { nombre: true, apellido: true } },
  pagadaPor: { select: { nombre: true, apellido: true } },
  movimiento: { select: { id: true, numero: true, monto: true, saldoAnterior: true, saldoPosterior: true, fecha: true } },
} satisfies Prisma.LiquidacionInclude;

@Injectable()
export class LiquidacionesService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private notificacionesService: NotificacionesService,
  ) {}

  /**
   * Calcula lo que se liquidaría hoy: todos los movimientos desde la última liquidación pagada.
   * total = saldo inicial + ingresos − descuentos + ajustes, y siempre coincide con el saldo actual.
   */
  async calcularPeriodo(wallet: Wallet, cliente: ClienteBD = this.prisma) {
    const ultimaLiquidacion = await cliente.movimientoWallet.findFirst({
      where: { walletId: wallet.id, tipo: 'LIQUIDACION' },
      orderBy: { numero: 'desc' },
    });
    const movimientos = await cliente.movimientoWallet.findMany({
      where: { walletId: wallet.id, numero: { gt: ultimaLiquidacion?.numero ?? 0 } },
      orderBy: { numero: 'asc' },
    });

    const saldoInicial = ultimaLiquidacion ? aCentavos(ultimaLiquidacion.saldoPosterior) : 0;
    const desglose = calcularDesgloseLiquidacion(
      saldoInicial,
      movimientos.map((movimiento) => ({ tipo: movimiento.tipo, montoCentavos: aCentavos(movimiento.monto) })),
    );

    if (desglose.totalCentavos !== aCentavos(wallet.saldo)) {
      // El acumulado de la wallet debe coincidir con el ledger; si no, no se liquida nada.
      throw new InternalServerErrorException('El saldo de la wallet no coincide con su historial de movimientos.');
    }

    return {
      desglose,
      periodoInicio: ultimaLiquidacion?.fecha ?? movimientos[0]?.fecha ?? wallet.fechaCreacion,
      periodoFin: new Date(),
      movimientoDesde: ultimaLiquidacion?.numero ?? 0,
      movimientoHasta: movimientos.length > 0 ? movimientos[movimientos.length - 1].numero : (ultimaLiquidacion?.numero ?? 0),
      cantidadMovimientos: movimientos.length,
    };
  }

  /** Motivo por el que no se puede liquidar un saldo, o null si es liquidable. */
  private motivoNoLiquidable(saldoCentavos: number): string | null {
    if (saldoCentavos < 0) {
      return `El trabajador tiene un saldo pendiente de ${formatearPesos(-saldoCentavos)} con ServiClean.`;
    }
    if (saldoCentavos === 0) return 'El trabajador no tiene saldo disponible para liquidar.';
    return null;
  }

  async vistaPrevia(personalId: string) {
    await this.validarPersonal(personalId);
    const wallet = await this.walletService.obtenerOCrear(personalId);
    const [periodo, pendiente] = await Promise.all([
      this.calcularPeriodo(wallet),
      this.prisma.liquidacion.findFirst({ where: { walletId: wallet.id, estado: 'PENDIENTE' } }),
    ]);
    const { desglose } = periodo;
    return {
      periodoInicio: periodo.periodoInicio,
      periodoFin: periodo.periodoFin,
      cantidadMovimientos: periodo.cantidadMovimientos,
      saldoInicial: aPesos(desglose.saldoInicialCentavos),
      ingresos: aPesos(desglose.ingresosCentavos),
      descuentos: aPesos(desglose.descuentosCentavos),
      ajustes: aPesos(desglose.ajustesCentavos),
      monto: aPesos(desglose.totalCentavos),
      liquidacionPendiente: pendiente,
      motivo: pendiente
        ? `Ya existe la liquidación ${referenciaLiquidacion(pendiente.numero)} pendiente de pago.`
        : this.motivoNoLiquidable(desglose.totalCentavos),
    };
  }

  async crear(administradorId: string, datos: CrearLiquidacionDto) {
    await this.validarPersonal(datos.personalId);

    const liquidacion = await this.prisma.$transaction(async (tx) => {
      const creada = await this.walletService.obtenerOCrear(datos.personalId, tx);
      const wallet = await this.walletService.bloquear(tx, creada.id);

      // Con la wallet bloqueada, dos solicitudes simultáneas no pueden crear dos liquidaciones.
      const pendiente = await tx.liquidacion.findFirst({ where: { walletId: wallet.id, estado: 'PENDIENTE' } });
      if (pendiente) {
        throw new ConflictException(
          `Ya existe la liquidación ${referenciaLiquidacion(pendiente.numero)} pendiente de pago para este trabajador.`,
        );
      }

      const periodo = await this.calcularPeriodo(wallet, tx);
      const motivo = this.motivoNoLiquidable(periodo.desglose.totalCentavos);
      if (motivo) throw new BadRequestException(motivo);

      return tx.liquidacion.create({
        data: {
          walletId: wallet.id,
          periodoInicio: periodo.periodoInicio,
          periodoFin: periodo.periodoFin,
          saldoInicial: aDecimal(periodo.desglose.saldoInicialCentavos),
          ingresos: aDecimal(periodo.desglose.ingresosCentavos),
          descuentos: aDecimal(periodo.desglose.descuentosCentavos),
          ajustes: aDecimal(periodo.desglose.ajustesCentavos),
          monto: aDecimal(periodo.desglose.totalCentavos),
          movimientoDesde: periodo.movimientoDesde,
          movimientoHasta: periodo.movimientoHasta,
          observaciones: datos.observaciones?.trim() || null,
          creadaPorId: administradorId,
        },
        include: INCLUIR_LIQUIDACION,
      });
    });

    await this.notificacionesService.crear(
      datos.personalId,
      `Se generó tu liquidación ${referenciaLiquidacion(liquidacion.numero)} por ${formatearPesos(aCentavos(liquidacion.monto))}.`,
    );
    return liquidacion;
  }

  /** Genera la liquidación del periodo para todo el personal con saldo disponible. */
  async generarPeriodo(administradorId: string) {
    const wallets = await this.walletService.listarWallets();
    const creadas: Awaited<ReturnType<LiquidacionesService['crear']>>[] = [];
    const omitidas: { personalId: string; nombre: string; motivo: string }[] = [];

    for (const wallet of wallets) {
      const nombre = `${wallet.personal.nombre} ${wallet.personal.apellido}`;
      try {
        creadas.push(await this.crear(administradorId, { personalId: wallet.personal.id }));
      } catch (error) {
        if (error instanceof BadRequestException || error instanceof ConflictException) {
          omitidas.push({ personalId: wallet.personal.id, nombre, motivo: error.message });
        } else {
          throw error;
        }
      }
    }
    return { creadas, omitidas };
  }

  /**
   * Marca la liquidación como pagada y descuenta exactamente su monto de la wallet (movimiento LIQUIDACION).
   * No se permite pagar más que el saldo disponible en ese momento.
   */
  async pagar(administradorId: string, id: string) {
    const liquidacion = await this.prisma.$transaction(async (tx) => {
      const encontrada = await tx.liquidacion.findUnique({ where: { id } });
      if (!encontrada) throw new NotFoundException('Liquidación no encontrada.');

      const wallet = await this.walletService.bloquear(tx, encontrada.walletId);
      // Se relee tras el bloqueo: si otra petición la pagó primero, esta se rechaza.
      const actual = await tx.liquidacion.findUniqueOrThrow({ where: { id } });
      if (actual.estado !== 'PENDIENTE') {
        throw new ConflictException(`La liquidación ya se encuentra ${actual.estado === 'PAGADA' ? 'pagada' : 'cancelada'}.`);
      }

      const montoCentavos = aCentavos(actual.monto);
      const saldoCentavos = aCentavos(wallet.saldo);
      if (montoCentavos > saldoCentavos) {
        throw new BadRequestException(
          `El saldo disponible actual (${formatearPesos(saldoCentavos)}) es menor que el monto de la liquidación ` +
            `(${formatearPesos(montoCentavos)}). Cancele esta liquidación y genere una nueva.`,
        );
      }

      await this.walletService.registrarMovimiento(tx, {
        personalId: wallet.personalId,
        tipo: 'LIQUIDACION',
        montoCentavos: -montoCentavos,
        concepto: `Liquidación ${referenciaLiquidacion(actual.numero)}`,
        liquidacionId: actual.id,
        autorizadoPorId: administradorId,
        claveIdempotencia: `LIQUIDACION:${actual.id}`,
      });

      // Condicionado al estado: si se canceló en paralelo, se revierte toda la transacción (incluido el movimiento).
      const actualizada = await tx.liquidacion.updateMany({
        where: { id, estado: 'PENDIENTE' },
        data: { estado: 'PAGADA', fechaPago: new Date(), pagadaPorId: administradorId },
      });
      if (actualizada.count !== 1) {
        throw new ConflictException('La liquidación cambió de estado mientras se procesaba el pago.');
      }
      return tx.liquidacion.findUniqueOrThrow({ where: { id }, include: INCLUIR_LIQUIDACION });
    });

    await this.notificacionesService.crear(
      liquidacion.wallet.personalId,
      `ServiClean pagó tu liquidación ${referenciaLiquidacion(liquidacion.numero)} por ${formatearPesos(aCentavos(liquidacion.monto))}.`,
    );
    return liquidacion;
  }

  /** Solo se cancelan liquidaciones pendientes; no generan movimientos y quedan en el historial. */
  async cancelar(id: string) {
    const resultado = await this.prisma.liquidacion.updateMany({
      where: { id, estado: 'PENDIENTE' },
      data: { estado: 'CANCELADA', fechaCancelacion: new Date() },
    });
    if (resultado.count === 0) {
      const existe = await this.prisma.liquidacion.findUnique({ where: { id } });
      if (!existe) throw new NotFoundException('Liquidación no encontrada.');
      throw new ConflictException('Solo se pueden cancelar liquidaciones pendientes.');
    }
    return this.prisma.liquidacion.findUniqueOrThrow({ where: { id }, include: INCLUIR_LIQUIDACION });
  }

  async listar(filtros: FiltrosLiquidacionesDto = {}) {
    const rango = rangoFechas(filtros.desde, filtros.hasta);
    return this.prisma.liquidacion.findMany({
      where: {
        ...(filtros.estado ? { estado: filtros.estado } : {}),
        ...(filtros.personalId ? { wallet: { personalId: filtros.personalId } } : {}),
        // Una liquidación pertenece al periodo si su periodo se cruza con el rango consultado.
        ...(rango?.lt ? { periodoInicio: { lt: rango.lt } } : {}),
        ...(rango?.gte ? { periodoFin: { gte: rango.gte } } : {}),
      },
      include: INCLUIR_LIQUIDACION,
      orderBy: { numero: 'desc' },
    });
  }

  async mias(personalId: string) {
    return this.prisma.liquidacion.findMany({
      where: { wallet: { personalId } },
      include: INCLUIR_LIQUIDACION,
      orderBy: { numero: 'desc' },
    });
  }

  /** Detalle con los movimientos que cubre. El personal solo puede ver sus propias liquidaciones. */
  async obtener(id: string, usuario: UsuarioAutenticado) {
    const liquidacion = await this.prisma.liquidacion.findUnique({ where: { id }, include: INCLUIR_LIQUIDACION });
    if (!liquidacion) throw new NotFoundException('Liquidación no encontrada.');
    if (usuario.rol !== 'ADMINISTRADOR' && liquidacion.wallet.personalId !== usuario.id) {
      throw new ForbiddenException('No tiene acceso a esta liquidación.');
    }

    const movimientos = await this.prisma.movimientoWallet.findMany({
      where: { walletId: liquidacion.walletId, numero: { gt: liquidacion.movimientoDesde, lte: liquidacion.movimientoHasta } },
      include: {
        solicitud: { select: { id: true, servicio: { select: { nombre: true } } } },
        pago: { select: { referencia: true, metodo: true } },
      },
      orderBy: { numero: 'asc' },
    });
    return { ...liquidacion, movimientos };
  }

  private async validarPersonal(personalId: string) {
    const personal = await this.prisma.usuario.findUnique({ where: { id: personalId } });
    if (!personal || personal.rol !== 'PERSONAL_ASEO') {
      throw new NotFoundException('Integrante del personal de aseo no encontrado.');
    }
  }
}
