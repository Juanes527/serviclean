import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearDisponibilidadDto } from './dto/crear-disponibilidad.dto';

@Injectable()
export class DisponibilidadService {
  constructor(private prisma: PrismaService) {}

  async crear(personalId: string, datos: CrearDisponibilidadDto) {
    if (datos.horaInicio >= datos.horaFin) {
      throw new BadRequestException('La hora de inicio debe ser anterior a la hora de fin.');
    }
    return this.prisma.disponibilidad.create({
      data: {
        personalId,
        fecha: new Date(datos.fecha),
        horaInicio: datos.horaInicio,
        horaFin: datos.horaFin,
      },
    });
  }

  async listarPorPersonal(personalId: string) {
    return this.prisma.disponibilidad.findMany({
      where: { personalId },
      orderBy: { fecha: 'asc' },
    });
  }

  async eliminar(personalId: string, id: string) {
    const registro = await this.prisma.disponibilidad.findUnique({ where: { id } });
    if (!registro) {
      throw new NotFoundException('Registro de disponibilidad no encontrado.');
    }
    if (registro.personalId !== personalId) {
      throw new ForbiddenException('No puede eliminar disponibilidad de otro usuario.');
    }
    await this.prisma.disponibilidad.delete({ where: { id } });
    return { mensaje: 'Disponibilidad eliminada correctamente.' };
  }

  async buscarPersonalDisponible(fecha: Date, hora: string) {
    return this.prisma.disponibilidad.findMany({
      where: {
        fecha,
        horaInicio: { lte: hora },
        horaFin: { gt: hora },
        personal: { estado: 'ACTIVO' },
      },
      include: { personal: true },
    });
  }
}
