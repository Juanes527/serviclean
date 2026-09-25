import { AsignacionesService } from './asignaciones.service';

describe('AsignacionesService', () => {
  let servicio: AsignacionesService;
  let prismaSimulado: any;
  let disponibilidadSimulado: any;
  let notificacionesSimulado: any;

  const solicitud: any = { id: 'sol-1', clienteId: 'cliente-1', fecha: new Date('2026-01-10'), hora: '09:00' };

  beforeEach(() => {
    prismaSimulado = {
      asignacion: {
        groupBy: jest.fn(() => [{ personalId: 'personal-1', _count: 2 }]),
        create: jest.fn(({ data }: any) => ({ id: 'asig-1', ...data })),
      },
      solicitud: { update: jest.fn() },
    };
    disponibilidadSimulado = {
      buscarPersonalDisponible: jest.fn(() => [
        { personal: { id: 'personal-1' } },
        { personal: { id: 'personal-2' } },
      ]),
    };
    notificacionesSimulado = { crear: jest.fn() };

    servicio = new AsignacionesService(prismaSimulado, disponibilidadSimulado, notificacionesSimulado);
  });

  it('asigna al integrante del personal con menor carga de trabajo', async () => {
    const asignacion = await servicio.intentarAsignarAutomaticamente(solicitud);

    expect(asignacion?.personalId).toBe('personal-2');
    expect(prismaSimulado.solicitud.update).toHaveBeenCalledWith({
      where: { id: 'sol-1' },
      data: { estado: 'ASIGNADO' },
    });
  });

  it('no asigna nada si no hay personal disponible', async () => {
    disponibilidadSimulado.buscarPersonalDisponible = jest.fn(() => []);

    const resultado = await servicio.intentarAsignarAutomaticamente(solicitud);

    expect(resultado).toBeNull();
    expect(prismaSimulado.asignacion.create).not.toHaveBeenCalled();
  });
});
