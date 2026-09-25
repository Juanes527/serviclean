import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoSolicitud, Solicitud } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DisponibilidadService } from '../disponibilidad/disponibilidad.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { SELECCION_USUARIO_PUBLICO } from '../comun/selecciones';
import { ReasignarDto } from './dto/reasignar.dto';

const ESTADOS_CARGA_ACTIVA: EstadoSolicitud[] = ['ASIGNADO', 'ACEPTADO', 'EN_PROCESO'];

@Injectable()
export class AsignacionesService {
  constructor(
    private prisma: PrismaService,
    private disponibilidadService: DisponibilidadService,
    private notificacionesService: NotificacionesService,
  ) {}

  async intentarAsignarAutomaticamente(solicitud: Solicitud) {
    const disponibilidades = await this.disponibilidadService.buscarPersonalDisponible(
      solicitud.fecha,
      solicitud.hora,
    );

    if (disponibilidades.length === 0) {
      return null;
    }

    const cargasPorPersonal = await this.prisma.asignacion.groupBy({
      by: ['personalId'],
      where: { solicitud: { estado: { in: ESTADOS_CARGA_ACTIVA } } },
      _count: true,
    });

    const cargaMap = new Map(cargasPorPersonal.map((c) => [c.personalId, c._count]));

    const candidatos = disponibilidades
      .map((d) => d.personal)
      .sort((a, b) => (cargaMap.get(a.id) ?? 0) - (cargaMap.get(b.id) ?? 0));

    const personalSeleccionado = candidatos[0];

    const asignacion = await this.prisma.asignacion.create({
      data: { solicitudId: solicitud.id, personalId: personalSeleccionado.id },
    });

    await this.prisma.solicitud.update({
      where: { id: solicitud.id },
      data: { estado: 'ASIGNADO' },
    });

    await this.notificacionesService.crear(
      solicitud.clienteId,
      'Tu solicitud fue asignada a un integrante del personal de aseo.',
    );
    await this.notificacionesService.crear(
      personalSeleccionado.id,
      'Se te asignó un nuevo servicio. Revisa tu agenda.',
    );

    return asignacion;
  }

  async listarPorPersonal(personalId: string) {
    return this.prisma.asignacion.findMany({
      where: { personalId },
      include: {
        solicitud: { include: { servicio: true, cliente: { select: SELECCION_USUARIO_PUBLICO } } },
      },
      orderBy: { fechaAsignacion: 'desc' },
    });
  }

  async listarTodas() {
    return this.prisma.asignacion.findMany({
      include: {
        solicitud: { include: { servicio: true, cliente: { select: SELECCION_USUARIO_PUBLICO } } },
        personal: { select: SELECCION_USUARIO_PUBLICO },
      },
      orderBy: { fechaAsignacion: 'desc' },
    });
  }

  async aceptar(personalId: string, id: string) {
    const asignacion = await this.prisma.asignacion.findUnique({
      where: { id },
      include: { solicitud: true },
    });
    if (!asignacion) {
      throw new NotFoundException('Asignación no encontrada.');
    }
    if (asignacion.personalId !== personalId) {
      throw new ForbiddenException('Esta asignación no le pertenece.');
    }

    await this.prisma.solicitud.update({
      where: { id: asignacion.solicitudId },
      data: { estado: 'ACEPTADO' },
    });

    await this.notificacionesService.crear(
      asignacion.solicitud.clienteId,
      'Tu servicio fue aceptado por el personal de aseo.',
    );

    return { mensaje: 'Servicio aceptado correctamente.' };
  }

  async reasignar(id: string, datos: ReasignarDto) {
    const asignacion = await this.prisma.asignacion.findUnique({ where: { id } });
    if (!asignacion) {
      throw new NotFoundException('Asignación no encontrada.');
    }
    // Si el servicio ya se reflejó en la wallet de alguien, reasignarlo descuadraría el ledger.
    const movimientos = await this.prisma.movimientoWallet.count({ where: { solicitudId: asignacion.solicitudId } });
    if (movimientos > 0) {
      throw new BadRequestException('Este servicio ya fue registrado en la wallet del personal y no se puede reasignar.');
    }

    const actualizada = await this.prisma.asignacion.update({
      where: { id },
      data: { personalId: datos.personalId },
    });

    await this.notificacionesService.crear(
      datos.personalId,
      'Se te asignó un servicio reasignado por el administrador.',
    );

    return actualizada;
  }
}
