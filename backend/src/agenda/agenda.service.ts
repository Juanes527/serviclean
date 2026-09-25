import { Injectable } from '@nestjs/common';
import { EstadoSolicitud } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SELECCION_USUARIO_PUBLICO } from '../comun/selecciones';

const ESTADOS_AGENDA: EstadoSolicitud[] = ['ASIGNADO', 'ACEPTADO', 'EN_PROCESO'];

@Injectable()
export class AgendaService {
  constructor(private prisma: PrismaService) {}

  async agendaCliente(clienteId: string) {
    return this.prisma.solicitud.findMany({
      where: { clienteId, estado: { in: ESTADOS_AGENDA } },
      include: {
        servicio: true,
        asignacion: { include: { personal: { select: SELECCION_USUARIO_PUBLICO } } },
      },
      orderBy: { fecha: 'asc' },
    });
  }

  async agendaPersonal(personalId: string) {
    return this.prisma.asignacion.findMany({
      where: { personal: { id: personalId }, solicitud: { estado: { in: ESTADOS_AGENDA } } },
      include: {
        solicitud: { include: { servicio: true, cliente: { select: SELECCION_USUARIO_PUBLICO } } },
      },
      orderBy: { solicitud: { fecha: 'asc' } },
    });
  }
}
