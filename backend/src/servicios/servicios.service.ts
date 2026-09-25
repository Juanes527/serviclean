import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearServicioDto } from './dto/crear-servicio.dto';
import { ActualizarServicioDto } from './dto/actualizar-servicio.dto';

@Injectable()
export class ServiciosService {
  constructor(private prisma: PrismaService) {}

  async listar(soloActivos: boolean) {
    return this.prisma.servicio.findMany({
      where: soloActivos ? { activo: true } : undefined,
      orderBy: { nombre: 'asc' },
    });
  }

  async obtenerPorId(id: string) {
    const servicio = await this.prisma.servicio.findUnique({ where: { id } });
    if (!servicio) {
      throw new NotFoundException('Servicio no encontrado.');
    }
    return servicio;
  }

  async crear(datos: CrearServicioDto) {
    return this.prisma.servicio.create({ data: datos });
  }

  async actualizar(id: string, datos: ActualizarServicioDto) {
    await this.obtenerPorId(id);
    return this.prisma.servicio.update({ where: { id }, data: datos });
  }

  async eliminar(id: string) {
    await this.obtenerPorId(id);
    await this.prisma.servicio.update({ where: { id }, data: { activo: false } });
    return { mensaje: 'El servicio fue desactivado correctamente.' };
  }
}
