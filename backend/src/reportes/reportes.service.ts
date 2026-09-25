import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportesService {
  constructor(private prisma: PrismaService) {}

  async resumen() {
    const [
      totalUsuarios,
      totalClientes,
      totalPersonal,
      totalServicios,
      solicitudesPendientes,
      solicitudesFinalizadas,
      solicitudesCanceladas,
      totalPagos,
      pagosPagados,
    ] = await this.prisma.$transaction([
      this.prisma.usuario.count(),
      this.prisma.usuario.count({ where: { rol: 'CLIENTE' } }),
      this.prisma.usuario.count({ where: { rol: 'PERSONAL_ASEO' } }),
      this.prisma.servicio.count({ where: { activo: true } }),
      this.prisma.solicitud.count({ where: { estado: 'PENDIENTE' } }),
      this.prisma.solicitud.count({ where: { estado: 'FINALIZADO' } }),
      this.prisma.solicitud.count({ where: { estado: 'CANCELADO' } }),
      this.prisma.pago.count(),
      this.prisma.pago.findMany({ where: { estado: 'PAGADO' } }),
    ]);

    const ingresosTotales = pagosPagados.reduce((suma, pago) => suma + Number(pago.monto), 0);

    return {
      totalUsuarios,
      totalClientes,
      totalPersonal,
      totalServicios,
      solicitudesPendientes,
      solicitudesFinalizadas,
      solicitudesCanceladas,
      totalPagos,
      ingresosTotales,
    };
  }

  async solicitudesPorEstado() {
    const resultado = await this.prisma.solicitud.groupBy({
      by: ['estado'],
      _count: { estado: true },
    });
    return resultado.map((item) => ({ estado: item.estado, total: item._count.estado }));
  }
}
