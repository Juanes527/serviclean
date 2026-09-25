import { BadRequestException, ConflictException } from '@nestjs/common';
import { CalificacionesService } from './calificaciones.service';

describe('CalificacionesService', () => {
  let servicio: CalificacionesService;
  let prismaSimulado: any;
  let notificacionesSimulado: any;

  const solicitudFinalizada = {
    id: 'sol-1',
    clienteId: 'cliente-1',
    estado: 'FINALIZADO',
    asignacion: { personalId: 'personal-1' },
  };

  beforeEach(() => {
    notificacionesSimulado = { crear: jest.fn() };
    prismaSimulado = {
      solicitud: { findUnique: jest.fn(() => solicitudFinalizada) },
      calificacion: {
        findUnique: jest.fn(() => null),
        create: jest.fn(({ data }: any) => ({ id: 'cal-1', ...data })),
        findMany: jest.fn(() => []),
      },
    };
    servicio = new CalificacionesService(prismaSimulado, notificacionesSimulado);
  });

  it('permite calificar un servicio finalizado sin calificación previa', async () => {
    const resultado = await servicio.crear('cliente-1', { solicitudId: 'sol-1', puntuacion: 5 });
    expect(resultado.puntuacion).toBe(5);
    expect(notificacionesSimulado.crear).toHaveBeenCalledWith('personal-1', expect.any(String));
  });

  it('rechaza calificar un servicio que no está finalizado', async () => {
    prismaSimulado.solicitud.findUnique = jest.fn(() => ({ ...solicitudFinalizada, estado: 'EN_PROCESO' }));

    await expect(servicio.crear('cliente-1', { solicitudId: 'sol-1', puntuacion: 5 })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rechaza calificar dos veces el mismo servicio', async () => {
    prismaSimulado.calificacion.findUnique = jest.fn(() => ({ id: 'cal-existente' }));

    await expect(servicio.crear('cliente-1', { solicitudId: 'sol-1', puntuacion: 4 })).rejects.toThrow(
      ConflictException,
    );
  });
});
