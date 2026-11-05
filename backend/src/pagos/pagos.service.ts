import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Pago, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { WalletService } from '../wallet/wallet.service';
import { SELECCION_USUARIO_PUBLICO } from '../comun/selecciones';
import { aCentavos, aDecimal, formatearPesos } from '../finanzas/dinero';
import { calcularDistribucion, generarReferenciaPago, rangoFechas } from '../finanzas/reglas-financieras';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';
import { ActualizarEstadoPagoDto } from './dto/actualizar-estado-pago.dto';
import { FiltrosPagosDto } from './dto/filtros-pagos.dto';

const INCLUIR_SOLICITUD = {
  solicitud: {
    include: {
      servicio: true,
      asignacion: { include: { personal: { select: SELECCION_USUARIO_PUBLICO } } },
    },
  },
} satisfies Prisma.PagoInclude;

/**
 * Pagos de servicios.
 *
 * El pago con tarjeta es 100 % SIMULADO: no hay integración con bancos ni pasarelas (Stripe, Wompi,
 * PayU, Mercado Pago…), no se hacen peticiones HTTP externas y no se almacena información sensible.
 */
@Injectable()
export class PagosService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private notificacionesService: NotificacionesService,
  ) {}

  async registrar(clienteId: string, datos: RegistrarPagoDto) {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id: datos.solicitudId },
      include: { servicio: true, pago: true },
    });
    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }
    if (solicitud.clienteId !== clienteId) {
      throw new ForbiddenException('Esta solicitud no le pertenece.');
    }
    if (solicitud.estado === 'CANCELADO') {
      throw new BadRequestException('No se puede pagar una solicitud cancelada.');
    }
    if (solicitud.pago) {
      return this.pagoExistente(solicitud.pago, datos);
    }

    const esTarjeta = datos.metodo === 'SIMULADO_TARJETA';
    const distribucion = calcularDistribucion(aCentavos(solicitud.servicio.precioBase));

    let resultado: { pago: Pago; movimientos: Awaited<ReturnType<WalletService['aplicarPagoDeSolicitud']>> };
    try {
      resultado = await this.prisma.$transaction(async (tx) => {
        const pago = await tx.pago.create({
          data: {
            referencia: generarReferenciaPago(),
            solicitudId: solicitud.id,
            clienteId,
            monto: aDecimal(distribucion.montoCentavos),
            metodo: datos.metodo,
            // Simulación: la tarjeta siempre se aprueba. El efectivo queda pendiente hasta que el personal
            // asignado confirme que lo recibió (confirmarEfectivoRecibido).
            estado: esTarjeta ? 'PAGADO' : 'PENDIENTE',
            porcentajeComision: distribucion.porcentajeComision,
            montoComision: aDecimal(distribucion.comisionCentavos),
            montoPersonal: aDecimal(distribucion.personalCentavos),
            tarjetaUltimos4: esTarjeta ? datos.tarjetaUltimos4 : null,
            tarjetaMarca: esTarjeta ? datos.tarjetaMarca : null,
          },
        });
        await tx.solicitud.update({ where: { id: solicitud.id }, data: { metodoPago: datos.metodo } });
        // Si el servicio ya estaba finalizado, el efecto en la wallet se aplica en esta misma transacción.
        const movimientos = await this.walletService.aplicarPagoDeSolicitud(tx, solicitud.id);
        return { pago, movimientos };
      });
    } catch (error) {
      // Doble clic / peticiones simultáneas: la restricción única de solicitudId impide el segundo pago.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existente = await this.prisma.pago.findUnique({ where: { solicitudId: solicitud.id } });
        if (existente) return this.pagoExistente(existente, datos);
      }
      throw error;
    }

    const { pago, movimientos } = resultado;
    await this.notificacionesService.crear(
      clienteId,
      esTarjeta
        ? `Tu pago simulado ${pago.referencia} por ${formatearPesos(distribucion.montoCentavos)} fue registrado correctamente.`
        : `Registramos que pagarás ${formatearPesos(distribucion.montoCentavos)} en efectivo al personal de aseo (${pago.referencia}). El personal confirmará cuando lo reciba.`,
    );
    const personalId = movimientos.length > 0 ? await this.personalDeSolicitud(solicitud.id) : null;
    if (personalId) await this.walletService.notificarEfectoServicio(personalId, movimientos);

    return pago;
  }

  /** Reintento del mismo pago: se devuelve el existente (idempotente). Otro método: conflicto. */
  private pagoExistente(pago: Pago, datos: RegistrarPagoDto) {
    const vigente = pago.estado === 'PAGADO' || (pago.estado === 'PENDIENTE' && pago.metodo === 'EFECTIVO');
    if (vigente && pago.metodo === datos.metodo) return pago;
    throw new ConflictException('Ya existe un pago registrado para esta solicitud.');
  }

  /**
   * El personal asignado confirma que recibió el efectivo del cliente. Solo entonces el pago queda PAGADO
   * y, si el servicio ya está finalizado, se aplica su efecto en la wallet. Si el cliente no alcanzó a
   * registrar el pago en la app, se crea aquí. Es idempotente: confirmar dos veces no duplica nada.
   */
  async confirmarEfectivoRecibido(personalId: string, solicitudId: string) {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id: solicitudId },
      include: { servicio: true, pago: true, asignacion: true },
    });
    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }
    if (solicitud.asignacion?.personalId !== personalId) {
      throw new ForbiddenException('Este servicio no le fue asignado.');
    }
    if ((solicitud.pago?.metodo ?? solicitud.metodoPago) !== 'EFECTIVO') {
      throw new BadRequestException('Este servicio no se paga en efectivo.');
    }
    if (solicitud.pago?.estado === 'PAGADO') {
      return solicitud.pago;
    }
    if (solicitud.pago && solicitud.pago.estado !== 'PENDIENTE') {
      throw new BadRequestException('El pago de este servicio fue anulado.');
    }
    if (!['EN_PROCESO', 'FINALIZADO'].includes(solicitud.estado)) {
      throw new BadRequestException('Solo puedes confirmar el pago cuando el servicio esté en proceso o finalizado.');
    }

    const distribucion = calcularDistribucion(aCentavos(solicitud.servicio.precioBase));
    const datosDistribucion = {
      porcentajeComision: distribucion.porcentajeComision,
      montoComision: aDecimal(distribucion.comisionCentavos),
      montoPersonal: aDecimal(distribucion.personalCentavos),
    };

    let resultado: { pago: Pago; movimientos: Awaited<ReturnType<WalletService['aplicarPagoDeSolicitud']>> };
    try {
      resultado = await this.prisma.$transaction(async (tx) => {
        if (solicitud.pago) {
          const cambio = await tx.pago.updateMany({
            where: { id: solicitud.pago.id, estado: 'PENDIENTE' },
            // La distribución guardada al registrar se respeta; solo se completa si faltaba.
            data: { estado: 'PAGADO', ...(solicitud.pago.montoPersonal === null ? datosDistribucion : {}) },
          });
          if (cambio.count !== 1) {
            throw new ConflictException('El pago ya fue actualizado.');
          }
        } else {
          await tx.pago.create({
            data: {
              referencia: generarReferenciaPago(),
              solicitudId,
              clienteId: solicitud.clienteId,
              monto: aDecimal(distribucion.montoCentavos),
              metodo: 'EFECTIVO',
              estado: 'PAGADO',
              ...datosDistribucion,
            },
          });
        }
        const movimientos = await this.walletService.aplicarPagoDeSolicitud(tx, solicitudId);
        return { pago: await tx.pago.findUniqueOrThrow({ where: { solicitudId } }), movimientos };
      });
    } catch (error) {
      // Doble clic: la otra petición ya confirmó el pago.
      const yaConfirmado =
        error instanceof ConflictException ||
        (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002');
      if (yaConfirmado) {
        const existente = await this.prisma.pago.findUnique({ where: { solicitudId } });
        if (existente?.estado === 'PAGADO') return existente;
      }
      throw error;
    }

    const { pago, movimientos } = resultado;
    await this.notificacionesService.crear(
      solicitud.clienteId,
      `El personal de aseo confirmó que recibió tu pago en efectivo de ${formatearPesos(distribucion.montoCentavos)} (${pago.referencia}).`,
    );
    await this.walletService.notificarEfectoServicio(personalId, movimientos);
    return pago;
  }

  private async personalDeSolicitud(solicitudId: string) {
    const asignacion = await this.prisma.asignacion.findUnique({ where: { solicitudId } });
    return asignacion?.personalId ?? null;
  }

  async misPagos(clienteId: string) {
    return this.prisma.pago.findMany({
      where: { clienteId },
      include: INCLUIR_SOLICITUD,
      orderBy: { fecha: 'desc' },
    });
  }

  async listarTodos(filtros: FiltrosPagosDto = {}) {
    const rango = rangoFechas(filtros.desde, filtros.hasta);
    return this.prisma.pago.findMany({
      where: {
        ...(filtros.metodo ? { metodo: filtros.metodo } : {}),
        ...(filtros.estado ? { estado: filtros.estado } : {}),
        ...(filtros.solicitudId ? { solicitudId: filtros.solicitudId } : {}),
        ...(filtros.personalId ? { solicitud: { asignacion: { personalId: filtros.personalId } } } : {}),
        ...(rango ? { fecha: rango } : {}),
      },
      include: { ...INCLUIR_SOLICITUD, cliente: { select: SELECCION_USUARIO_PUBLICO } },
      orderBy: { fecha: 'desc' },
    });
  }

  /**
   * Verificación de pagos históricos pendientes (Nequi / transferencia) por parte del administrador.
   * Solo se verifica un pago PENDIENTE; si se confirma, se aplica su efecto financiero.
   */
  async actualizarEstado(id: string, datos: ActualizarEstadoPagoDto) {
    const pago = await this.prisma.pago.findUnique({ where: { id } });
    if (!pago) {
      throw new NotFoundException('Pago no encontrado.');
    }
    if (pago.estado !== 'PENDIENTE') {
      throw new BadRequestException('Solo se pueden verificar pagos pendientes.');
    }

    const { actualizado, movimientos } = await this.prisma.$transaction(async (tx) => {
      const distribucion = calcularDistribucion(aCentavos(pago.monto));
      const cambio = await tx.pago.updateMany({
        where: { id, estado: 'PENDIENTE' },
        data: {
          estado: datos.estado,
          ...(datos.estado === 'PAGADO'
            ? {
                porcentajeComision: distribucion.porcentajeComision,
                montoComision: aDecimal(distribucion.comisionCentavos),
                montoPersonal: aDecimal(distribucion.personalCentavos),
              }
            : {}),
        },
      });
      if (cambio.count !== 1) {
        throw new ConflictException('El pago ya fue verificado.');
      }
      const movimientos = datos.estado === 'PAGADO' ? await this.walletService.aplicarPagoDeSolicitud(tx, pago.solicitudId) : [];
      return { actualizado: await tx.pago.findUniqueOrThrow({ where: { id } }), movimientos };
    });

    const personalId = movimientos.length > 0 ? await this.personalDeSolicitud(pago.solicitudId) : null;
    if (personalId) await this.walletService.notificarEfectoServicio(personalId, movimientos);
    return actualizado;
  }

  /**
   * Al cancelar una solicitud: un pago con tarjeta simulada se marca REEMBOLSADO (reembolso simulado);
   * un pago en efectivo o pendiente queda CANCELADO. Nunca ocurre después de afectar una wallet,
   * porque solo los servicios finalizados generan movimientos y esos no se pueden cancelar.
   */
  async anularPorCancelacion(tx: Prisma.TransactionClient, solicitudId: string) {
    const pago = await tx.pago.findUnique({ where: { solicitudId } });
    if (!pago || pago.estado === 'CANCELADO' || pago.estado === 'REEMBOLSADO') return null;
    const estado = pago.estado === 'PAGADO' && pago.metodo !== 'EFECTIVO' ? 'REEMBOLSADO' : 'CANCELADO';
    return tx.pago.update({ where: { id: pago.id }, data: { estado } });
  }
}
