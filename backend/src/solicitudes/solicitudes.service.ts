import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoSolicitud } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AsignacionesService } from '../asignaciones/asignaciones.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { PagosService } from '../pagos/pagos.service';
import { WalletService } from '../wallet/wallet.service';
import { UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';
import { SELECCION_USUARIO_PUBLICO } from '../comun/selecciones';
import { CrearSolicitudDto } from './dto/crear-solicitud.dto';
import { ActualizarEstadoSolicitudDto } from './dto/actualizar-estado-solicitud.dto';

const INCLUIR_RELACIONES = {
  servicio: true,
  cliente: { select: SELECCION_USUARIO_PUBLICO },
  asignacion: { include: { personal: { select: SELECCION_USUARIO_PUBLICO } } },
  pago: true,
  calificacion: true,
};

@Injectable()
export class SolicitudesService {
  constructor(
    private prisma: PrismaService,
    private asignacionesService: AsignacionesService,
    private notificacionesService: NotificacionesService,
    private pagosService: PagosService,
    private walletService: WalletService,
  ) {}

  async crear(clienteId: string, datos: CrearSolicitudDto) {
    const servicio = await this.prisma.servicio.findUnique({ where: { id: datos.servicioId } });
    if (!servicio || !servicio.activo) {
      throw new BadRequestException('El servicio seleccionado no está disponible.');
    }

    const fecha = new Date(datos.fecha);
    const ahora = new Date();
    const hoy = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()));
    if (fecha < hoy) {
      throw new BadRequestException('La fecha del servicio no puede estar en el pasado.');
    }

    const solicitud = await this.prisma.solicitud.create({
      data: {
        clienteId,
        servicioId: datos.servicioId,
        fecha,
        hora: datos.hora,
        direccion: datos.direccion,
        telefono: datos.telefono,
        observaciones: datos.observaciones,
        metodoPago: datos.metodoPago,
      },
      include: INCLUIR_RELACIONES,
    });

    await this.notificacionesService.crear(clienteId, 'Tu solicitud fue creada y está pendiente de asignación.');
    await this.asignacionesService.intentarAsignarAutomaticamente(solicitud);

    return this.obtenerPorId(solicitud.id, { id: clienteId, correo: '', rol: 'CLIENTE' });
  }

  async misSolicitudes(clienteId: string) {
    return this.prisma.solicitud.findMany({
      where: { clienteId },
      include: INCLUIR_RELACIONES,
      orderBy: { fechaCreacion: 'desc' },
    });
  }

  async listarTodas(estado?: EstadoSolicitud) {
    return this.prisma.solicitud.findMany({
      where: estado ? { estado } : undefined,
      include: INCLUIR_RELACIONES,
      orderBy: { fechaCreacion: 'desc' },
    });
  }

  async obtenerPorId(id: string, usuario: UsuarioAutenticado) {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id },
      include: INCLUIR_RELACIONES,
    });
    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    const tieneAcceso =
      usuario.rol === 'ADMINISTRADOR' ||
      solicitud.clienteId === usuario.id ||
      solicitud.asignacion?.personalId === usuario.id;

    if (!tieneAcceso) {
      throw new ForbiddenException('No tiene acceso a esta solicitud.');
    }

    return solicitud;
  }

  async cancelar(id: string, usuario: UsuarioAutenticado) {
    const solicitud = await this.prisma.solicitud.findUnique({ where: { id } });
    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    if (usuario.rol === 'CLIENTE' && solicitud.clienteId !== usuario.id) {
      throw new ForbiddenException('No puede cancelar una solicitud que no es suya.');
    }

    if (['FINALIZADO', 'CANCELADO'].includes(solicitud.estado)) {
      throw new BadRequestException('Esta solicitud ya no puede ser cancelada.');
    }

    const pagoAnulado = await this.prisma.$transaction(async (tx) => {
      await tx.solicitud.update({ where: { id }, data: { estado: 'CANCELADO' } });
      return this.pagosService.anularPorCancelacion(tx, id);
    });
    await this.notificacionesService.crear(
      solicitud.clienteId,
      pagoAnulado?.estado === 'REEMBOLSADO'
        ? 'Tu solicitud fue cancelada. El pago simulado con tarjeta fue reembolsado.'
        : 'Tu solicitud fue cancelada.',
    );

    return { mensaje: 'La solicitud fue cancelada correctamente.' };
  }

  async actualizarEstado(id: string, usuario: UsuarioAutenticado, datos: ActualizarEstadoSolicitudDto) {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id },
      include: { asignacion: true },
    });
    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    if (usuario.rol === 'PERSONAL_ASEO') {
      if (solicitud.asignacion?.personalId !== usuario.id) {
        throw new ForbiddenException('Este servicio no le fue asignado.');
      }
      const transicionesValidas: Record<string, string[]> = {
        ACEPTADO: ['EN_PROCESO'],
        EN_PROCESO: ['FINALIZADO'],
      };
      const permitidos = transicionesValidas[solicitud.estado] ?? [];
      if (!permitidos.includes(datos.estado)) {
        throw new BadRequestException('No puede cambiar el servicio a este estado desde su estado actual.');
      }
    }

    // Un servicio que ya afectó una wallet quedó liquidado financieramente: su estado no puede cambiar.
    if (await this.walletService.existenMovimientosDeSolicitud(id)) {
      throw new BadRequestException('Este servicio ya fue registrado financieramente y su estado no puede cambiar.');
    }

    const movimientos = await this.prisma.$transaction(async (tx) => {
      await tx.solicitud.update({ where: { id }, data: { estado: datos.estado } });
      if (datos.estado === 'CANCELADO') {
        await this.pagosService.anularPorCancelacion(tx, id);
        return [];
      }
      // Al finalizar un servicio pagado se acredita (tarjeta) o compensa (efectivo) la wallet del personal.
      return datos.estado === 'FINALIZADO' ? this.walletService.aplicarPagoDeSolicitud(tx, id) : [];
    });
    if (solicitud.asignacion) {
      await this.walletService.notificarEfectoServicio(solicitud.asignacion.personalId, movimientos);
    }

    const mensajes: Record<string, string> = {
      EN_PROCESO: 'Tu servicio se encuentra en proceso.',
      FINALIZADO: 'Tu servicio fue finalizado.',
      CANCELADO: 'Tu solicitud fue cancelada.',
    };
    await this.notificacionesService.crear(solicitud.clienteId, mensajes[datos.estado]);

    return { mensaje: 'El estado del servicio fue actualizado correctamente.' };
  }
}
