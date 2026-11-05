import { AsignacionesService } from './asignaciones.service';

/** Servicio activo ya asignado: [personalId, hora, duración en minutos]. */
type ServicioDelDia = [string, string, number];

describe('AsignacionesService', () => {
  let servicio: AsignacionesService;
  let prismaSimulado: any;
  let disponibilidadSimulado: any;
  let notificacionesSimulado: any;

  // Valores que cada prueba ajusta.
  let disponibles: { id: string; horaFin?: string }[];
  let serviciosDelDia: ServicioDelDia[];
  let promedios: Record<string, number>;
  let promedioGeneral: number | null;
  let cargas: Record<string, number>;
  let ultimasAsignaciones: Record<string, string>;

  const solicitud: any = {
    id: 'sol-1',
    clienteId: 'cliente-1',
    fecha: new Date('2026-01-10'),
    hora: '09:00',
    servicio: { duracionMinutos: 120 },
  };

  const filtrar = <T extends string>(ids: string[], mapa: Record<T, unknown>) => ids.filter((id) => id in mapa);

  beforeEach(() => {
    disponibles = [{ id: 'personal-1' }, { id: 'personal-2' }];
    serviciosDelDia = [];
    promedios = {};
    promedioGeneral = null;
    cargas = {};
    ultimasAsignaciones = {};

    prismaSimulado = {
      asignacion: {
        findMany: jest.fn(() =>
          serviciosDelDia.map(([personalId, hora, duracionMinutos]) => ({ personalId, solicitud: { hora, servicio: { duracionMinutos } } })),
        ),
        groupBy: jest.fn(({ by, where, _count, _max }: any) => {
          const ids: string[] = where.personalId.in;
          if (_count) return filtrar(ids, cargas).map((personalId) => ({ personalId, _count: cargas[personalId] }));
          if (_max) {
            return filtrar(ids, ultimasAsignaciones).map((personalId) => ({
              personalId,
              _max: { fechaAsignacion: new Date(ultimasAsignaciones[personalId]) },
            }));
          }
          throw new Error(`groupBy inesperado: ${by}`);
        }),
        create: jest.fn(({ data }: any) => ({ id: 'asig-1', ...data })),
      },
      calificacion: {
        groupBy: jest.fn(({ where }: any) =>
          filtrar(where.personalId.in, promedios).map((personalId) => ({ personalId, _avg: { puntuacion: promedios[personalId] } })),
        ),
        aggregate: jest.fn(() => ({ _avg: { puntuacion: promedioGeneral } })),
      },
      solicitud: { update: jest.fn() },
    };
    disponibilidadSimulado = {
      buscarPersonalDisponible: jest.fn(() =>
        disponibles.map(({ id, horaFin }) => ({ horaInicio: '08:00', horaFin: horaFin ?? '17:00', personal: { id } })),
      ),
    };
    notificacionesSimulado = { crear: jest.fn() };

    servicio = new AsignacionesService(prismaSimulado, disponibilidadSimulado, notificacionesSimulado);
  });

  const asignar = async () => (await servicio.intentarAsignarAutomaticamente(solicitud))?.personalId ?? null;

  it('asigna al integrante con mejor calificación promedio', async () => {
    promedios = { 'personal-1': 4.9, 'personal-2': 4.2 };
    cargas = { 'personal-1': 3 };

    expect(await asignar()).toBe('personal-1');
    expect(prismaSimulado.solicitud.update).toHaveBeenCalledWith({ where: { id: 'sol-1' }, data: { estado: 'ASIGNADO' } });
  });

  it('el personal sin calificaciones compite con el promedio general', async () => {
    promedios = { 'personal-1': 3.5 };
    promedioGeneral = 4;

    expect(await asignar()).toBe('personal-2');
  });

  it('con la misma calificación, gana quien tiene menos servicios activos', async () => {
    promedios = { 'personal-1': 4.5, 'personal-2': 4.5 };
    cargas = { 'personal-1': 2 };

    expect(await asignar()).toBe('personal-2');
  });

  it('con la misma calificación y carga, gana quien lleva más tiempo sin recibir un servicio', async () => {
    ultimasAsignaciones = { 'personal-1': '2026-01-05T10:00:00Z', 'personal-2': '2026-01-08T10:00:00Z' };

    expect(await asignar()).toBe('personal-1');
  });

  it('no asigna a quien ya tiene un servicio que se cruza con ese horario', async () => {
    promedios = { 'personal-1': 5, 'personal-2': 3 };
    serviciosDelDia = [['personal-1', '10:00', 60]]; // 10:00–11:00 se cruza con 09:00–11:00

    expect(await asignar()).toBe('personal-2');
  });

  it('un servicio que termina justo cuando empieza el nuevo no es un cruce', async () => {
    promedios = { 'personal-1': 5, 'personal-2': 3 };
    serviciosDelDia = [['personal-1', '07:00', 120]]; // 07:00–09:00

    expect(await asignar()).toBe('personal-1');
  });

  it('no asigna a quien no alcanza a terminar el servicio dentro de su disponibilidad', async () => {
    promedios = { 'personal-1': 5, 'personal-2': 3 };
    disponibles = [{ id: 'personal-1', horaFin: '10:30' }, { id: 'personal-2' }];

    expect(await asignar()).toBe('personal-2');
  });

  it('deja la solicitud pendiente si todos están ocupados a esa hora', async () => {
    serviciosDelDia = [
      ['personal-1', '09:00', 120],
      ['personal-2', '08:00', 90],
    ];

    expect(await asignar()).toBeNull();
    expect(prismaSimulado.asignacion.create).not.toHaveBeenCalled();
  });

  it('no asigna nada si no hay personal disponible', async () => {
    disponibles = [];

    expect(await asignar()).toBeNull();
    expect(prismaSimulado.asignacion.create).not.toHaveBeenCalled();
  });
});
