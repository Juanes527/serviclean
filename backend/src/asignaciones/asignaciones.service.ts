import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoSolicitud, Servicio, Solicitud } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DisponibilidadService } from '../disponibilidad/disponibilidad.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { SELECCION_USUARIO_PUBLICO } from '../comun/selecciones';
import { ReasignarDto } from './dto/reasignar.dto';

const ESTADOS_CARGA_ACTIVA: EstadoSolicitud[] = ['ASIGNADO', 'ACEPTADO', 'EN_PROCESO'];

/** "HH:mm" → minutos desde la medianoche. */
const aMinutos = (hora: string) => {
  const [horas, minutos] = hora.split(':').map(Number);
  return horas * 60 + minutos;
};

@Injectable()
export class AsignacionesService {
  constructor(
    private prisma: PrismaService,
    private disponibilidadService: DisponibilidadService,
    private notificacionesService: NotificacionesService,
  ) {}

  /**
   * Elige a quién darle una solicitud nueva:
   * 1. Solo personal activo disponible a la hora de inicio (la disponibilidad indica cuándo puede
   *    empezar un servicio, aunque termine después) y sin otro servicio activo que se cruce ese día.
   * 2. Gana la mejor calificación promedio. Quien aún no tiene calificaciones cuenta con el
   *    promedio general, para que el personal nuevo también reciba trabajo.
   * 3. Empates: menos servicios activos, luego quien lleva más tiempo sin recibir una asignación.
   */
  async intentarAsignarAutomaticamente(solicitud: Solicitud & { servicio: Pick<Servicio, 'duracionMinutos'> }) {
    const inicio = aMinutos(solicitud.hora);
    const fin = inicio + solicitud.servicio.duracionMinutos;

    const disponibles = (await this.disponibilidadService.buscarPersonalDisponible(solicitud.fecha, solicitud.hora))
      .map((d) => d.personal);
    const idsDisponibles = [...new Set(disponibles.map((p) => p.id))];
    if (idsDisponibles.length === 0) {
      return null;
    }

    const serviciosDelDia = await this.prisma.asignacion.findMany({
      where: {
        personalId: { in: idsDisponibles },
        solicitud: { fecha: solicitud.fecha, estado: { in: ESTADOS_CARGA_ACTIVA } },
      },
      select: { personalId: true, solicitud: { select: { hora: true, servicio: { select: { duracionMinutos: true } } } } },
    });
    const ocupados = new Set(
      serviciosDelDia
        .filter(({ solicitud: otro }) => {
          const otroInicio = aMinutos(otro.hora);
          return otroInicio < fin && inicio < otroInicio + otro.servicio.duracionMinutos;
        })
        .map((a) => a.personalId),
    );
    const candidatos = idsDisponibles.filter((id) => !ocupados.has(id));
    if (candidatos.length === 0) {
      return null;
    }

    const [calificaciones, general, cargas, ultimas] = await Promise.all([
      this.prisma.calificacion.groupBy({ by: ['personalId'], where: { personalId: { in: candidatos } }, _avg: { puntuacion: true } }),
      this.prisma.calificacion.aggregate({ _avg: { puntuacion: true } }),
      this.prisma.asignacion.groupBy({
        by: ['personalId'],
        where: { personalId: { in: candidatos }, solicitud: { estado: { in: ESTADOS_CARGA_ACTIVA } } },
        _count: true,
      }),
      this.prisma.asignacion.groupBy({ by: ['personalId'], where: { personalId: { in: candidatos } }, _max: { fechaAsignacion: true } }),
    ]);
    const promedioGeneral = general._avg.puntuacion ?? 0;
    const promedio = new Map(calificaciones.map((c) => [c.personalId, c._avg.puntuacion ?? promedioGeneral]));
    const carga = new Map(cargas.map((c) => [c.personalId, c._count]));
    const ultima = new Map(ultimas.map((u) => [u.personalId, u._max.fechaAsignacion?.getTime() ?? 0]));

    const [personalSeleccionadoId] = candidatos.sort(
      (a, b) =>
        (promedio.get(b) ?? promedioGeneral) - (promedio.get(a) ?? promedioGeneral) ||
        (carga.get(a) ?? 0) - (carga.get(b) ?? 0) ||
        (ultima.get(a) ?? 0) - (ultima.get(b) ?? 0) ||
        a.localeCompare(b),
    );
    const personalSeleccionado = { id: personalSeleccionadoId };

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
        // El pago se incluye para que el personal vea si debe confirmar el efectivo recibido.
        solicitud: { include: { servicio: true, pago: true, cliente: { select: SELECCION_USUARIO_PUBLICO } } },
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
