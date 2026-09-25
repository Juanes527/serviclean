import { BadRequestException } from '@nestjs/common';
import { PrismaEnMemoria } from '../finanzas/pruebas/prisma-en-memoria';
import { WalletService } from './wallet.service';

describe('WalletService', () => {
  let bd: PrismaEnMemoria;
  let servicio: WalletService;
  let clienteId: string;
  let personalId: string;
  const notificaciones = { crear: jest.fn() };

  /** Crea un servicio pagado y lo finaliza, aplicando su efecto en la wallet. */
  async function servicioPagado(precio: number, metodo: 'SIMULADO_TARJETA' | 'EFECTIVO') {
    const solicitudId = bd.crearSolicitud({ clienteId, personalId, precio, estado: 'FINALIZADO' });
    const comision = Math.round(precio * 20) / 100;
    bd.tablas.pago.push({
      id: `pago-${solicitudId}`,
      referencia: `PAY-${solicitudId.slice(-6)}`,
      solicitudId,
      clienteId,
      monto: precio,
      metodo,
      estado: 'PAGADO',
      porcentajeComision: 20,
      montoComision: comision,
      montoPersonal: precio - comision,
    });
    return bd.$transaction((tx) => servicio.aplicarPagoDeSolicitud(tx as any, solicitudId));
  }

  beforeEach(() => {
    bd = new PrismaEnMemoria();
    servicio = new WalletService(bd as any, notificaciones as any);
    clienteId = bd.crearUsuario('CLIENTE');
    personalId = bd.crearUsuario('PERSONAL_ASEO');
  });

  it('servicio con tarjeta: acredita el 80 % en la wallet del personal', async () => {
    const movimientos = await servicioPagado(50000, 'SIMULADO_TARJETA');

    expect(movimientos).toHaveLength(1);
    expect(movimientos[0].tipo).toBe('INGRESO_SERVICIO');
    expect(Number(movimientos[0].monto)).toBe(40000);
    expect(bd.saldo(personalId)).toBe(40000);
  });

  it('servicio en efectivo: registra la parte del personal y el efectivo recibido, dejando saldo negativo', async () => {
    const movimientos = await servicioPagado(50000, 'EFECTIVO');

    expect(movimientos.map((m) => [m.tipo, Number(m.monto)])).toEqual([
      ['INGRESO_SERVICIO', 40000],
      ['PAGO_EFECTIVO', -50000],
    ]);
    // El trabajador tiene los $50.000 del cliente pero solo le corresponden $40.000: debe la comisión.
    expect(bd.saldo(personalId)).toBe(-10000);
  });

  it('compensa automáticamente un saldo negativo con servicios posteriores pagados con tarjeta', async () => {
    await servicioPagado(50000, 'EFECTIVO'); // −10.000
    await servicioPagado(37500, 'SIMULADO_TARJETA'); // +30.000 → 20.000
    expect(bd.saldo(personalId)).toBe(20000);

    await servicioPagado(200000, 'EFECTIVO'); // −40.000 → −20.000
    expect(bd.saldo(personalId)).toBe(-20000);
    await servicioPagado(12500, 'SIMULADO_TARJETA'); // +10.000 → −10.000
    expect(bd.saldo(personalId)).toBe(-10000);
    await servicioPagado(37500, 'SIMULADO_TARJETA'); // +30.000 → 20.000
    expect(bd.saldo(personalId)).toBe(20000);
  });

  it('encadena los movimientos: el saldo anterior de cada uno es el saldo posterior del previo', async () => {
    await servicioPagado(50000, 'SIMULADO_TARJETA');
    await servicioPagado(80000, 'EFECTIVO');
    await servicioPagado(140000, 'SIMULADO_TARJETA');

    const movimientos = bd.movimientosDe(personalId);
    let saldo = 0;
    for (const movimiento of movimientos) {
      expect(Number(movimiento.saldoAnterior)).toBe(saldo);
      saldo += Number(movimiento.monto);
      expect(Number(movimiento.saldoPosterior)).toBe(saldo);
    }
    // El acumulado de la wallet coincide con el ledger.
    expect(bd.saldo(personalId)).toBe(saldo);
    expect(saldo).toBe(40000 + 64000 - 80000 + 112000);
  });

  it('es idempotente: aplicar dos veces el mismo pago no duplica movimientos ni créditos', async () => {
    await servicioPagado(50000, 'SIMULADO_TARJETA');
    const solicitudId = bd.tablas.solicitud[0].id;

    const segundaVez = await bd.$transaction((tx) => servicio.aplicarPagoDeSolicitud(tx as any, solicitudId));

    expect(segundaVez).toHaveLength(1);
    expect(bd.movimientosDe(personalId)).toHaveLength(1);
    expect(bd.saldo(personalId)).toBe(40000);
  });

  it('no afecta la wallet si el servicio aún no ha finalizado', async () => {
    const solicitudId = bd.crearSolicitud({ clienteId, personalId, precio: 50000, estado: 'EN_PROCESO' });
    bd.tablas.pago.push({ id: 'pago-x', referencia: 'PAY-X', solicitudId, monto: 50000, metodo: 'SIMULADO_TARJETA', estado: 'PAGADO' });

    const movimientos = await bd.$transaction((tx) => servicio.aplicarPagoDeSolicitud(tx as any, solicitudId));

    expect(movimientos).toEqual([]);
    expect(bd.saldo(personalId)).toBe(0);
  });

  it('bloquea la wallet (SELECT … FOR UPDATE) antes de modificar el saldo', async () => {
    await servicioPagado(50000, 'SIMULADO_TARJETA');
    expect(bd.bloqueos.length).toBeGreaterThan(0);
  });

  it('valida el signo según el tipo de movimiento', async () => {
    await expect(
      bd.$transaction((tx) =>
        servicio.registrarMovimiento(tx as any, { personalId, tipo: 'LIQUIDACION', montoCentavos: 1000, concepto: 'Inválido' }),
      ),
    ).rejects.toThrow(BadRequestException);
    await expect(
      bd.$transaction((tx) => servicio.registrarMovimiento(tx as any, { personalId, tipo: 'AJUSTE', montoCentavos: 0, concepto: 'Cero' })),
    ).rejects.toThrow(BadRequestException);
  });

  it('los ajustes del administrador quedan registrados con quién los autorizó', async () => {
    const adminId = bd.crearUsuario('ADMINISTRADOR');
    await servicio.crearAjuste(adminId, personalId, { tipo: 'DESCUENTO', monto: 5000, concepto: 'Implementos perdidos' });
    await servicio.crearAjuste(adminId, personalId, { tipo: 'BONIFICACION', monto: -8000, concepto: 'Puntualidad' });

    const [descuento, bonificacion] = bd.movimientosDe(personalId);
    expect(Number(descuento.monto)).toBe(-5000);
    expect(Number(bonificacion.monto)).toBe(8000);
    expect(descuento.autorizadoPorId).toBe(adminId);
    expect(bd.saldo(personalId)).toBe(3000);
  });

  it('un ajuste repetido con la misma clave de idempotencia no se duplica', async () => {
    const adminId = bd.crearUsuario('ADMINISTRADOR');
    const datos = { tipo: 'AJUSTE' as const, monto: 7000, concepto: 'Corrección', claveIdempotencia: '6f1c1d3e-8a4b-4c1a-9d2e-3b5f7a9c1e20' };

    await servicio.crearAjuste(adminId, personalId, datos);
    await servicio.crearAjuste(adminId, personalId, datos);

    expect(bd.movimientosDe(personalId)).toHaveLength(1);
    expect(bd.saldo(personalId)).toBe(7000);
  });
});
