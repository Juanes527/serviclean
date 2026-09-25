import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificacionesService {
  constructor(private prisma: PrismaService) {}

  async crear(usuarioId: string, mensaje: string) {
    return this.prisma.notificacion.create({ data: { usuarioId, mensaje } });
  }

  async listarPorUsuario(usuarioId: string) {
    return this.prisma.notificacion.findMany({
      where: { usuarioId },
      orderBy: { fechaCreacion: 'desc' },
      take: 50,
    });
  }

  async contarNoLeidas(usuarioId: string) {
    const total = await this.prisma.notificacion.count({
      where: { usuarioId, leida: false },
    });
    return { total };
  }

  async marcarComoLeida(usuarioId: string, id: string) {
    await this.prisma.notificacion.updateMany({
      where: { id, usuarioId },
      data: { leida: true },
    });
    return { mensaje: 'Notificación marcada como leída.' };
  }

  async marcarTodasComoLeidas(usuarioId: string) {
    await this.prisma.notificacion.updateMany({
      where: { usuarioId, leida: false },
      data: { leida: true },
    });
    return { mensaje: 'Todas las notificaciones fueron marcadas como leídas.' };
  }
}
