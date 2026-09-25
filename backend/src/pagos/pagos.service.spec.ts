import { BadRequestException, ConflictException, ForbiddenException, ValidationPipe } from '@nestjs/common';
import { PrismaEnMemoria } from '../finanzas/pruebas/prisma-en-memoria';
import { WalletService } from '../wallet/wallet.service';
import { PagosService } from './pagos.service';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';

const NUMERO_TARJETA = '4242424242424242';
const CVV = '987';

/** Aplica el mismo ValidationPipe global de main.ts (whitelist + transform). */
async function validarCuerpo(cuerpo: Record<string, unknown>): Promise<RegistrarPagoDto> {
  const pipe = new ValidationPipe({ whitelist: true, transform: true });
  return pipe.transform(cuerpo, { type: 'body', metatype: RegistrarPagoDto });
}

describe('PagosService', () => {
  let bd: PrismaEnMemoria;
  let pagos: PagosService;
  let wallet: WalletService;
  let clienteId: string;
  let personalId: string;
  const notificaciones = { crear: jest.fn() };

  beforeEach(() => {
    bd = new PrismaEnMemoria();
    wallet = new WalletService(bd as any, notificaciones as any);
    pagos = new PagosService(bd as any, wallet, notificaciones as any);
    clienteId = bd.crearUsuario('CLIENTE');
    personalId = bd.crearUsuario('PERSONAL_ASEO');
  });

  describe('tarjeta simulada', () => {
    const datosTarjeta = (solicitudId: string): RegistrarPagoDto => ({
      solicitudId,
      metodo: 'SIMULADO_TARJETA',
      tarjetaUltimos4: '4242',
      tarjetaMarca: 'VISA',
    });

    it('registra un pago simulado exitoso con referencia única', async () => {
      const solicitudId = bd.crearSolicitud({ clienteId, personalId, precio: 50000 });

      const pago = await pagos.registrar(clienteId, datosTarjeta(solicitudId));

      expect(pago.estado).toBe('PAGADO');
      expect(pago.metodo).toBe('SIMULADO_TARJETA');
      expect(pago.referencia).toMatch(/^PAY-[0-9A-F]{10}$/);
      expect(pago.tarjetaUltimos4).toBe('4242');
      expect(pago.tarjetaMarca).toBe('VISA');
      expect(Number(pago.montoComision)).toBe(10000);
      expect(Number(pago.montoPersonal)).toBe(40000);
    });

    it('no realiza ningún cobro real: no hay peticiones HTTP a pasarelas', async () => {
      const espiaFetch = jest.spyOn(global, 'fetch').mockImplementation(() => {
        throw new Error('No debe haber peticiones externas');
      });
      const solicitudId = bd.crearSolicitud({ clienteId, personalId, precio: 50000 });

      await pagos.registrar(clienteId, datosTarjeta(solicitudId));

      expect(espiaFetch).not.toHaveBeenCalled();
      espiaFetch.mockRestore();
    });

    it('descarta el número completo y el CVV aunque se envíen al backend', async () => {
      const cuerpo = await validarCuerpo({
        solicitudId: 'sol-1',
        metodo: 'SIMULADO_TARJETA',
        tarjetaUltimos4: '4242',
        tarjetaMarca: 'VISA',
        numeroTarjeta: NUMERO_TARJETA,
        cvv: CVV,
        vencimiento: '12/30',
      });

      expect(cuerpo).not.toHaveProperty('numeroTarjeta');
      expect(cuerpo).not.toHaveProperty('cvv');
      expect(cuerpo).not.toHaveProperty('vencimiento');
    });

    it('no almacena el número completo de la tarjeta ni el CVV', async () => {
      const solicitudId = bd.crearSolicitud({ clienteId, personalId, precio: 50000 });
      const datos = { ...datosTarjeta(solicitudId), numeroTarjeta: NUMERO_TARJETA, cvv: CVV } as RegistrarPagoDto;

      await pagos.registrar(clienteId, datos);

      const almacenado = JSON.stringify(bd.tablas);
      expect(almacenado).not.toContain(NUMERO_TARJETA);
      expect(almacenado).not.toContain(`"${CVV}"`);
      expect(Object.keys(bd.tablas.pago[0])).not.toEqual(expect.arrayContaining(['numeroTarjeta', 'cvv']));
    });

    it('exige los últimos 4 dígitos y la marca al pagar con tarjeta', async () => {
      await expect(validarCuerpo({ solicitudId: 'sol-1', metodo: 'SIMULADO_TARJETA' })).rejects.toBeDefined();
      await expect(validarCuerpo({ solicitudId: 'sol-1', metodo: 'SIMULADO_TARJETA', tarjetaUltimos4: '42', tarjetaMarca: 'VISA' })).rejects.toBeDefined();
    });

    it('rechaza métodos que ya no se ofrecen (Nequi, transferencia)', async () => {
      await expect(validarCuerpo({ solicitudId: 'sol-1', metodo: 'NEQUI' })).rejects.toBeDefined();
    });

    it('genera el movimiento positivo en la wallet cuando el servicio ya está finalizado', async () => {
      const solicitudId = bd.crearSolicitud({ clienteId, personalId, precio: 50000, estado: 'FINALIZADO' });

      await pagos.registrar(clienteId, datosTarjeta(solicitudId));

      const movimientos = bd.movimientosDe(personalId);
      expect(movimientos).toHaveLength(1);
      expect(movimientos[0].tipo).toBe('INGRESO_SERVICIO');
      expect(Number(movimientos[0].monto)).toBe(40000);
      expect(bd.saldo(personalId)).toBe(40000);
    });

    it('si el servicio aún no ha finalizado, el pago queda registrado y la wallet se afecta después', async () => {
      const solicitudId = bd.crearSolicitud({ clienteId, personalId, precio: 50000, estado: 'ACEPTADO' });

      await pagos.registrar(clienteId, datosTarjeta(solicitudId));
      expect(bd.movimientosDe(personalId)).toHaveLength(0);

      bd.finalizar(solicitudId);
      await bd.$transaction((tx) => wallet.aplicarPagoDeSolicitud(tx as any, solicitudId));
      expect(bd.saldo(personalId)).toBe(40000);
    });

    it('evita duplicados por doble clic: un solo pago y un solo crédito', async () => {
      const solicitudId = bd.crearSolicitud({ clienteId, personalId, precio: 50000, estado: 'FINALIZADO' });

      const [primero, segundo] = await Promise.all([
        pagos.registrar(clienteId, datosTarjeta(solicitudId)),
        pagos.registrar(clienteId, datosTarjeta(solicitudId)),
      ]);

      expect(segundo.id).toBe(primero.id);
      expect(bd.tablas.pago).toHaveLength(1);
      expect(bd.movimientosDe(personalId)).toHaveLength(1);
      expect(bd.saldo(personalId)).toBe(40000);
    });

    it('rechaza un segundo pago con un método distinto', async () => {
      const solicitudId = bd.crearSolicitud({ clienteId, personalId, precio: 50000 });
      await pagos.registrar(clienteId, datosTarjeta(solicitudId));

      await expect(pagos.registrar(clienteId, { solicitudId, metodo: 'EFECTIVO' })).rejects.toThrow(ConflictException);
    });

    it('el monto lo define el precio del servicio, no el cliente', async () => {
      const solicitudId = bd.crearSolicitud({ clienteId, personalId, precio: 80000 });

      const pago = await pagos.registrar(clienteId, { ...datosTarjeta(solicitudId), monto: 1 } as RegistrarPagoDto);

      expect(Number(pago.monto)).toBe(80000);
    });
  });

  describe('efectivo', () => {
    it('registra el pago en efectivo', async () => {
      const solicitudId = bd.crearSolicitud({ clienteId, personalId, precio: 50000 });

      const pago = await pagos.registrar(clienteId, { solicitudId, metodo: 'EFECTIVO' });

      expect(pago.metodo).toBe('EFECTIVO');
      expect(pago.estado).toBe('PAGADO');
      expect(pago.tarjetaUltimos4).toBeNull();
    });

    it('genera los movimientos correctos y puede dejar la wallet en negativo', async () => {
      const solicitudId = bd.crearSolicitud({ clienteId, personalId, precio: 50000, estado: 'FINALIZADO' });

      await pagos.registrar(clienteId, { solicitudId, metodo: 'EFECTIVO' });

      expect(bd.movimientosDe(personalId).map((m) => [m.tipo, Number(m.monto)])).toEqual([
        ['INGRESO_SERVICIO', 40000],
        ['PAGO_EFECTIVO', -50000],
      ]);
      expect(bd.saldo(personalId)).toBe(-10000);
    });

    it('un saldo negativo se compensa con futuros servicios pagados con tarjeta', async () => {
      const enEfectivo = bd.crearSolicitud({ clienteId, personalId, precio: 50000, estado: 'FINALIZADO' });
      const conTarjeta = bd.crearSolicitud({ clienteId, personalId, precio: 50000, estado: 'FINALIZADO' });

      await pagos.registrar(clienteId, { solicitudId: enEfectivo, metodo: 'EFECTIVO' });
      expect(bd.saldo(personalId)).toBe(-10000);
      await pagos.registrar(clienteId, { solicitudId: conTarjeta, metodo: 'SIMULADO_TARJETA', tarjetaUltimos4: '1111', tarjetaMarca: 'MASTERCARD' });
      expect(bd.saldo(personalId)).toBe(30000);
    });
  });

  describe('reglas generales', () => {
    it('un cliente no puede pagar una solicitud de otro cliente', async () => {
      const otroCliente = bd.crearUsuario('CLIENTE');
      const solicitudId = bd.crearSolicitud({ clienteId: otroCliente, personalId, precio: 50000 });

      await expect(pagos.registrar(clienteId, { solicitudId, metodo: 'EFECTIVO' })).rejects.toThrow(ForbiddenException);
    });

    it('no permite pagar una solicitud cancelada', async () => {
      const solicitudId = bd.crearSolicitud({ clienteId, personalId, precio: 50000, estado: 'CANCELADO' });

      await expect(pagos.registrar(clienteId, { solicitudId, metodo: 'EFECTIVO' })).rejects.toThrow(BadRequestException);
    });

    it('al cancelar la solicitud, el pago con tarjeta simulada queda reembolsado', async () => {
      const solicitudId = bd.crearSolicitud({ clienteId, personalId, precio: 50000 });
      await pagos.registrar(clienteId, { solicitudId, metodo: 'SIMULADO_TARJETA', tarjetaUltimos4: '4242', tarjetaMarca: 'VISA' });

      const anulado = await bd.$transaction((tx) => pagos.anularPorCancelacion(tx as any, solicitudId));

      expect(anulado?.estado).toBe('REEMBOLSADO');
      expect(bd.movimientosDe(personalId)).toHaveLength(0);
    });

    it('el administrador solo verifica pagos históricos pendientes', async () => {
      const solicitudId = bd.crearSolicitud({ clienteId, personalId, precio: 50000, estado: 'FINALIZADO' });
      bd.tablas.pago.push({ id: 'pago-nequi', referencia: 'PAY-NEQUI', solicitudId, monto: 50000, metodo: 'NEQUI', estado: 'PENDIENTE', porcentajeComision: null, montoComision: null, montoPersonal: null });

      await pagos.actualizarEstado('pago-nequi', { estado: 'PAGADO' });
      expect(bd.saldo(personalId)).toBe(40000);
      await expect(pagos.actualizarEstado('pago-nequi', { estado: 'CANCELADO' })).rejects.toThrow(BadRequestException);
    });
  });
});
