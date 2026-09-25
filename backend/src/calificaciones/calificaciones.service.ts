import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { CrearCalificacionDto } from './dto/crear-calificacion.dto';

@Injectable()
export class CalificacionesService {
  constructor(
    private prisma: PrismaService,
    private notificacionesService: NotificacionesService,
  ) {}

  async crear(clienteId: string, datos: CrearCalificacionDto) {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id: datos.solicitudId },
      include: { asignacion: true },
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }
    if (solicitud.clienteId !== clienteId) {
      throw new ForbiddenException('Esta solicitud no le pertenece.');
    }
    if (solicitud.estado !== 'FINALIZADO') {
      throw new BadRequestException('Solo puede calificar servicios finalizados.');
    }
    if (!solicitud.asignacion) {
      throw new BadRequestException('Este servicio no tiene personal asignado.');
    }

    const calificacionExistente = await this.prisma.calificacion.findUnique({
      where: { solicitudId: datos.solicitudId },
    });
    if (calificacionExistente) {
      throw new ConflictException('Este servicio ya fue calificado.');
    }

    const calificacion = await this.prisma.calificacion.create({
      data: {
        solicitudId: datos.solicitudId,
        clienteId,
        personalId: solicitud.asignacion.personalId,
        puntuacion: datos.puntuacion,
        comentario: datos.comentario,
      },
    });

    await this.notificacionesService.crear(
      solicitud.asignacion.personalId,
      'Recibiste una nueva calificación de un cliente.',
    );

    return calificacion;
  }

  async promedioPersonal(personalId: string) {
    const calificaciones = await this.prisma.calificacion.findMany({ where: { personalId } });
    if (calificaciones.length === 0) {
      return { promedio: 0, total: 0, calificaciones: [] };
    }
    const suma = calificaciones.reduce((acumulado, actual) => acumulado + actual.puntuacion, 0);
    return {
      promedio: Number((suma / calificaciones.length).toFixed(1)),
      total: calificaciones.length,
      calificaciones,
    };
  }
}
