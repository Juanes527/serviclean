import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaEnMemoria } from '../finanzas/pruebas/prisma-en-memoria';
import { WalletService } from '../wallet/wallet.service';
import { LiquidacionesService } from './liquidaciones.service';

describe('LiquidacionesService', () => {
  let bd: PrismaEnMemoria;
  let wallet: WalletService;
  let liquidaciones: LiquidacionesService;
  let adminId: string;
  let clienteId: string;
  let personalId: string;
  const notificaciones = { crear: jest.fn() };

  async function servicioPagado(precio: number, metodo: 'SIMULADO_TARJETA' | 'EFECTIVO') {
    const solicitudId = bd.crearSolicitud({ clienteId, personalId, precio, estado: 'FINALIZADO' });
    bd.tablas.pago.push({ id: `pago-${solicitudId}`, referencia: `PAY-${solicitudId}`, solicitudId, clienteId, monto: precio, metodo, estado: 'PAGADO', porcentajeComision: null, montoComision: null, montoPersonal: null });
    await bd.$transaction((tx) => wallet.aplicarPagoDeSolicitud(tx as any, solicitudId));
  }

  beforeEach(() => {
    bd = new PrismaEnMemoria();
    wallet = new WalletService(bd as any, notificaciones as any);
    liquidaciones = new LiquidacionesService(bd as any, wallet, notificaciones as any);
    adminId = bd.crearUsuario('ADMINISTRADOR');
    clienteId = bd.crearUsuario('CLIENTE');
    personalId = bd.crearUsuario('PERSONAL_ASEO');
  });

  it('no permite liquidar un saldo negativo e informa la deuda', async () => {
    await servicioPagado(150000, 'EFECTIVO'); // −30.000

    await expect(liquidaciones.crear(adminId, { personalId })).rejects.toThrow(
      new BadRequestException('El trabajador tiene un saldo pendiente de $30.000 con ServiClean.'),
    );
    expect(bd.tablas.liquidacion).toHaveLength(0);
  });

  it('no permite liquidar un saldo en cero', async () => {
    await expect(liquidaciones.crear(adminId, { personalId })).rejects.toThrow(BadRequestException);
  });

  it('crea la liquidación con el desglose del periodo y el total igual al saldo disponible', async () => {
    await servicioPagado(100000, 'SIMULADO_TARJETA'); // +80.000
    await servicioPagado(50000, 'EFECTIVO'); // +40.000 −50.000
    await wallet.crearAjuste(adminId, personalId, { tipo: 'AJUSTE', monto: 10000, concepto: 'Transporte' });

    const liquidacion = await liquidaciones.crear(adminId, { personalId });

    expect(liquidacion.estado).toBe('PENDIENTE');
    expect(Number(liquidacion.saldoInicial)).toBe(0);
    expect(Number(liquidacion.ingresos)).toBe(120000);
    expect(Number(liquidacion.descuentos)).toBe(50000);
    expect(Number(liquidacion.ajustes)).toBe(10000);
    expect(Number(liquidacion.monto)).toBe(80000);
    expect(Number(liquidacion.monto)).toBe(bd.saldo(personalId));
  });

  it('al marcarla como pagada genera un movimiento LIQUIDACION negativo y deja el saldo en cero', async () => {
    await servicioPagado(100000, 'SIMULADO_TARJETA');
    const creada = await liquidaciones.crear(adminId, { personalId });

    const pagada = await liquidaciones.pagar(adminId, creada.id);

    expect(pagada.estado).toBe('PAGADA');
    expect(pagada.fechaPago).toBeInstanceOf(Date);
    const ultimo = bd.movimientosDe(personalId).at(-1)!;
    expect(ultimo.tipo).toBe('LIQUIDACION');
    expect(Number(ultimo.monto)).toBe(-80000);
    expect(ultimo.liquidacionId).toBe(creada.id);
    expect(bd.saldo(personalId)).toBe(0);
    // Los movimientos anteriores se conservan.
    expect(bd.movimientosDe(personalId)).toHaveLength(2);
  });

  it('no duplica liquidaciones: solo puede haber una pendiente por trabajador', async () => {
    await servicioPagado(100000, 'SIMULADO_TARJETA');
    await liquidaciones.crear(adminId, { personalId });

    await expect(liquidaciones.crear(adminId, { personalId })).rejects.toThrow(ConflictException);
    expect(bd.tablas.liquidacion).toHaveLength(1);
  });

  it('no paga dos veces la misma liquidación', async () => {
    await servicioPagado(100000, 'SIMULADO_TARJETA');
    const creada = await liquidaciones.crear(adminId, { personalId });
    await liquidaciones.pagar(adminId, creada.id);

    await expect(liquidaciones.pagar(adminId, creada.id)).rejects.toThrow(ConflictException);
    expect(bd.movimientosDe(personalId).filter((m) => m.tipo === 'LIQUIDACION')).toHaveLength(1);
    expect(bd.saldo(personalId)).toBe(0);
  });

  it('no permite pagar más que el saldo disponible y revierte todo el intento', async () => {
    await servicioPagado(100000, 'SIMULADO_TARJETA'); // +80.000
    const creada = await liquidaciones.crear(adminId, { personalId });
    await servicioPagado(250000, 'EFECTIVO'); // −50.000 → saldo 30.000 < 80.000

    await expect(liquidaciones.pagar(adminId, creada.id)).rejects.toThrow(BadRequestException);
    expect(bd.tablas.liquidacion[0].estado).toBe('PENDIENTE');
    expect(bd.movimientosDe(personalId).some((m) => m.tipo === 'LIQUIDACION')).toBe(false);
    expect(bd.saldo(personalId)).toBe(30000);
  });

  it('la siguiente liquidación parte del saldo que quedó después de la anterior', async () => {
    await servicioPagado(100000, 'SIMULADO_TARJETA');
    await liquidaciones.pagar(adminId, (await liquidaciones.crear(adminId, { personalId })).id);
    await servicioPagado(50000, 'SIMULADO_TARJETA'); // +40.000

    const segunda = await liquidaciones.crear(adminId, { personalId });

    expect(Number(segunda.saldoInicial)).toBe(0);
    expect(Number(segunda.ingresos)).toBe(40000);
    expect(Number(segunda.monto)).toBe(40000);
    expect(segunda.movimientoDesde).toBe(bd.tablas.liquidacion[0].movimientoHasta + 1);
  });

  it('una liquidación cancelada no genera movimientos y permite generar otra', async () => {
    await servicioPagado(100000, 'SIMULADO_TARJETA');
    const creada = await liquidaciones.crear(adminId, { personalId });

    const cancelada = await liquidaciones.cancelar(creada.id);

    expect(cancelada.estado).toBe('CANCELADA');
    expect(bd.saldo(personalId)).toBe(80000);
    await expect(liquidaciones.crear(adminId, { personalId })).resolves.toBeDefined();
    await expect(liquidaciones.pagar(adminId, creada.id)).rejects.toThrow(ConflictException);
  });

  it('el personal no puede ver liquidaciones de otro trabajador', async () => {
    await servicioPagado(100000, 'SIMULADO_TARJETA');
    const creada = await liquidaciones.crear(adminId, { personalId });
    const otro = bd.crearUsuario('PERSONAL_ASEO');

    await expect(liquidaciones.obtener(creada.id, { id: otro, correo: 'o@c.com', rol: 'PERSONAL_ASEO' })).rejects.toThrow(ForbiddenException);
    await expect(liquidaciones.obtener(creada.id, { id: personalId, correo: 'p@c.com', rol: 'PERSONAL_ASEO' })).resolves.toBeDefined();
    await expect(liquidaciones.obtener(creada.id, { id: adminId, correo: 'a@c.com', rol: 'ADMINISTRADOR' })).resolves.toBeDefined();
  });
});
