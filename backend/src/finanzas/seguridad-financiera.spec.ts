import { ExecutionContext, ForbiddenException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { RolUsuario } from '@prisma/client';
import { RolesGuard } from '../comun/guards/roles.guard';
import { CLAVE_ROLES } from '../comun/decoradores/roles.decorador';
import { WalletController } from '../wallet/wallet.controller';
import { LiquidacionesController } from '../liquidaciones/liquidaciones.controller';
import { PagosController } from '../pagos/pagos.controller';
import { ReportesController } from '../reportes/reportes.controller';

type Controlador = new (...args: any[]) => object;

const guard = new RolesGuard(new Reflector());

function contexto(controlador: Controlador, metodo: string, rol: RolUsuario): ExecutionContext {
  return {
    getHandler: () => (controlador.prototype as any)[metodo],
    getClass: () => controlador,
    switchToHttp: () => ({ getRequest: () => ({ user: { id: 'usuario-1', correo: 'u@serviclean.com', rol } }) }),
  } as unknown as ExecutionContext;
}

function puedeAcceder(controlador: Controlador, metodo: string, rol: RolUsuario): boolean {
  try {
    return guard.canActivate(contexto(controlador, metodo, rol));
  } catch (error) {
    if (error instanceof ForbiddenException) return false;
    throw error;
  }
}

/** Todos los endpoints de un controlador con su método HTTP y los roles permitidos. */
function endpoints(controlador: Controlador) {
  const reflector = new Reflector();
  return Object.getOwnPropertyNames(controlador.prototype)
    .filter((nombre) => nombre !== 'constructor')
    .map((nombre) => {
      const manejador = (controlador.prototype as any)[nombre];
      return {
        nombre,
        metodoHttp: Reflect.getMetadata(METHOD_METADATA, manejador) as RequestMethod,
        roles: reflector.getAllAndOverride<RolUsuario[]>(CLAVE_ROLES, [manejador, controlador]) ?? [],
      };
    });
}

describe('Seguridad del módulo financiero (guards del backend)', () => {
  describe('CLIENTE', () => {
    it('puede pagar sus servicios y consultar sus pagos', () => {
      expect(puedeAcceder(PagosController, 'registrar', 'CLIENTE')).toBe(true);
      expect(puedeAcceder(PagosController, 'misPagos', 'CLIENTE')).toBe(true);
    });

    it('no puede consultar wallets, movimientos, liquidaciones ni reportes', () => {
      for (const metodo of ['miWallet', 'misMovimientos', 'listar', 'walletDePersonal', 'movimientosDePersonal', 'movimientos']) {
        expect(puedeAcceder(WalletController, metodo, 'CLIENTE')).toBe(false);
      }
      expect(puedeAcceder(LiquidacionesController, 'listar', 'CLIENTE')).toBe(false);
      expect(puedeAcceder(LiquidacionesController, 'obtener', 'CLIENTE')).toBe(false);
      expect(puedeAcceder(ReportesController, 'resumenFinanciero', 'CLIENTE')).toBe(false);
      expect(puedeAcceder(PagosController, 'listarTodos', 'CLIENTE')).toBe(false);
    });
  });

  describe('PERSONAL_ASEO', () => {
    it('puede consultar su propia wallet, sus movimientos y sus liquidaciones', () => {
      expect(puedeAcceder(WalletController, 'miWallet', 'PERSONAL_ASEO')).toBe(true);
      expect(puedeAcceder(WalletController, 'misMovimientos', 'PERSONAL_ASEO')).toBe(true);
      expect(puedeAcceder(LiquidacionesController, 'mias', 'PERSONAL_ASEO')).toBe(true);
    });

    it('no puede modificar su wallet ni crear movimientos o ajustes', () => {
      expect(puedeAcceder(WalletController, 'crearAjuste', 'PERSONAL_ASEO')).toBe(false);
      // Ningún endpoint de escritura de la wallet está disponible para el personal.
      const escritura = endpoints(WalletController).filter((e) => e.metodoHttp !== RequestMethod.GET);
      expect(escritura.length).toBeGreaterThan(0);
      escritura.forEach((endpoint) => expect(endpoint.roles).toEqual([RolUsuario.ADMINISTRADOR]));
    });

    it('no puede crear, pagar ni cancelar liquidaciones', () => {
      expect(puedeAcceder(LiquidacionesController, 'crear', 'PERSONAL_ASEO')).toBe(false);
      expect(puedeAcceder(LiquidacionesController, 'pagar', 'PERSONAL_ASEO')).toBe(false);
      expect(puedeAcceder(LiquidacionesController, 'cancelar', 'PERSONAL_ASEO')).toBe(false);
      expect(puedeAcceder(LiquidacionesController, 'generarPeriodo', 'PERSONAL_ASEO')).toBe(false);
    });

    it('no puede registrar ni modificar pagos, ni consultar wallets ajenas', () => {
      expect(puedeAcceder(PagosController, 'registrar', 'PERSONAL_ASEO')).toBe(false);
      expect(puedeAcceder(PagosController, 'actualizarEstado', 'PERSONAL_ASEO')).toBe(false);
      expect(puedeAcceder(WalletController, 'walletDePersonal', 'PERSONAL_ASEO')).toBe(false);
      expect(puedeAcceder(WalletController, 'movimientos', 'PERSONAL_ASEO')).toBe(false);
    });

    it('al consultar sus movimientos siempre se usa su propio id, aunque envíe otro trabajador en el filtro', async () => {
      const walletService = { movimientosDePersonal: jest.fn() };
      const controlador = new WalletController(walletService as any);

      await controlador.misMovimientos({ id: 'personal-1', correo: 'p@c.com', rol: 'PERSONAL_ASEO' }, { personalId: 'personal-2' });

      expect(walletService.movimientosDePersonal).toHaveBeenCalledWith('personal-1', expect.objectContaining({ personalId: undefined }));
    });
  });

  describe('ADMINISTRADOR', () => {
    it('puede consultar y operar toda la información financiera', () => {
      for (const controlador of [WalletController, LiquidacionesController, ReportesController] as Controlador[]) {
        endpoints(controlador)
          .filter((endpoint) => endpoint.roles.includes(RolUsuario.ADMINISTRADOR))
          .forEach((endpoint) => expect(puedeAcceder(controlador, endpoint.nombre, 'ADMINISTRADOR')).toBe(true));
      }
      expect(puedeAcceder(PagosController, 'listarTodos', 'ADMINISTRADOR')).toBe(true);
      expect(puedeAcceder(WalletController, 'crearAjuste', 'ADMINISTRADOR')).toBe(true);
      expect(puedeAcceder(LiquidacionesController, 'pagar', 'ADMINISTRADOR')).toBe(true);
    });

    it('todos los endpoints financieros declaran roles explícitos (ninguno queda abierto a cualquier usuario autenticado)', () => {
      for (const controlador of [WalletController, LiquidacionesController, PagosController, ReportesController] as Controlador[]) {
        endpoints(controlador).forEach((endpoint) => expect(endpoint.roles.length).toBeGreaterThan(0));
      }
    });
  });
});
