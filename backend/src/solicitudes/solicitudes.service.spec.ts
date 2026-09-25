import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SolicitudesService } from './solicitudes.service';

describe('SolicitudesService', () => {
  let servicio: SolicitudesService;
  let prismaSimulado: any;
  let asignacionesSimulado: any;
  let notificacionesSimulado: any;
  let pagosSimulado: any;
  let walletSimulado: any;
  let solicitudes: any[];

  beforeEach(() => {
    solicitudes = [
      {
        id: 'sol-1',
        clienteId: 'cliente-1',
        estado: 'ACEPTADO',
        asignacion: { personalId: 'personal-1' },
      },
    ];

    prismaSimulado = {
      servicio: { findUnique: jest.fn(() => ({ id: 'serv-1', activo: true })) },
      solicitud: {
        create: jest.fn(({ data }: any) => ({ id: 'sol-2', estado: 'PENDIENTE', asignacion: null, ...data })),
        findUnique: jest.fn(({ where }: any) => solicitudes.find((s) => s.id === where.id) ?? null),
        update: jest.fn(({ where, data }: any) => {
          const solicitud = solicitudes.find((s) => s.id === where.id);
          Object.assign(solicitud, data);
          return solicitud;
        }),
      },
    };

    prismaSimulado.$transaction = jest.fn((operacion: any) => operacion(prismaSimulado));

    asignacionesSimulado = { intentarAsignarAutomaticamente: jest.fn() };
    notificacionesSimulado = { crear: jest.fn() };
    pagosSimulado = { anularPorCancelacion: jest.fn(() => null) };
    walletSimulado = {
      existenMovimientosDeSolicitud: jest.fn(() => false),
      aplicarPagoDeSolicitud: jest.fn(() => []),
      notificarEfectoServicio: jest.fn(),
    };

    servicio = new SolicitudesService(prismaSimulado, asignacionesSimulado, notificacionesSimulado, pagosSimulado, walletSimulado);
  });

  it('al finalizar un servicio aplica su efecto en la wallet dentro de la misma transacción', async () => {
    solicitudes[0].estado = 'EN_PROCESO';

    await servicio.actualizarEstado('sol-1', { id: 'personal-1', correo: 'p@correo.com', rol: 'PERSONAL_ASEO' }, { estado: 'FINALIZADO' });

    expect(prismaSimulado.$transaction).toHaveBeenCalled();
    expect(walletSimulado.aplicarPagoDeSolicitud).toHaveBeenCalledWith(prismaSimulado, 'sol-1');
    expect(solicitudes[0].estado).toBe('FINALIZADO');
  });

  it('no permite cambiar el estado de un servicio que ya afectó una wallet', async () => {
    walletSimulado.existenMovimientosDeSolicitud = jest.fn(() => true);

    await expect(
      servicio.actualizarEstado('sol-1', { id: 'admin-1', correo: 'a@correo.com', rol: 'ADMINISTRADOR' }, { estado: 'CANCELADO' }),
    ).rejects.toThrow(BadRequestException);
    expect(prismaSimulado.solicitud.update).not.toHaveBeenCalled();
  });

  it('al cancelar una solicitud anula o reembolsa su pago', async () => {
    await servicio.cancelar('sol-1', { id: 'cliente-1', correo: 'c@correo.com', rol: 'CLIENTE' });

    expect(pagosSimulado.anularPorCancelacion).toHaveBeenCalledWith(prismaSimulado, 'sol-1');
    expect(solicitudes[0].estado).toBe('CANCELADO');
  });

  it('permite que el personal asignado marque el servicio como en proceso', async () => {
    await servicio.actualizarEstado(
      'sol-1',
      { id: 'personal-1', correo: 'p@correo.com', rol: 'PERSONAL_ASEO' },
      { estado: 'EN_PROCESO' },
    );

    expect(solicitudes[0].estado).toBe('EN_PROCESO');
  });

  it('rechaza que otro integrante del personal cambie el estado', async () => {
    await expect(
      servicio.actualizarEstado(
        'sol-1',
        { id: 'personal-2', correo: 'otro@correo.com', rol: 'PERSONAL_ASEO' },
        { estado: 'EN_PROCESO' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rechaza una transición de estado inválida para el personal', async () => {
    await expect(
      servicio.actualizarEstado(
        'sol-1',
        { id: 'personal-1', correo: 'p@correo.com', rol: 'PERSONAL_ASEO' },
        { estado: 'FINALIZADO' },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('crea una solicitud en estado pendiente e intenta asignarla automáticamente', async () => {
    prismaSimulado.solicitud.findUnique = jest.fn(() => ({
      id: 'sol-2',
      clienteId: 'cliente-1',
      estado: 'PENDIENTE',
      asignacion: null,
    }));

    await servicio.crear('cliente-1', {
      servicioId: 'serv-1',
      fecha: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      hora: '09:00',
      direccion: 'Calle 1',
      telefono: '3000000000',
      metodoPago: 'EFECTIVO',
    });

    expect(asignacionesSimulado.intentarAsignarAutomaticamente).toHaveBeenCalled();
    expect(notificacionesSimulado.crear).toHaveBeenCalled();
  });
});
