import { Prisma } from '@prisma/client';

/**
 * Base de datos en memoria para las pruebas del módulo financiero.
 * Implementa solo las operaciones de Prisma que usan pagos, wallet y liquidaciones, con:
 *  - restricciones únicas (solicitudId y referencia de pago, clave de idempotencia de movimientos),
 *  - transacciones con reversión completa si ocurre un error,
 *  - secuencia autoincremental para movimientos y liquidaciones.
 * Así las pruebas verifican la lógica real de saldos sin depender de PostgreSQL.
 */

type Registro = Record<string, any>;
type Tablas = Record<'usuario' | 'servicio' | 'solicitud' | 'asignacion' | 'pago' | 'wallet' | 'movimientoWallet' | 'liquidacion' | 'notificacion', Registro[]>;

const UNICOS: Partial<Record<keyof Tablas, string[]>> = {
  pago: ['solicitudId', 'referencia'],
  wallet: ['personalId'],
  movimientoWallet: ['claveIdempotencia', 'liquidacionId'],
  asignacion: ['solicitudId'],
};

let contadorIds = 0;
const nuevoId = (prefijo: string) => `${prefijo}-${String(++contadorIds).padStart(4, '0')}-0000-0000-000000000000`;

function cumple(registro: Registro, where: Registro = {}): boolean {
  return Object.entries(where).every(([campo, condicion]) => {
    if (condicion === undefined) return true;
    const valor = registro[campo];
    if (condicion !== null && typeof condicion === 'object' && !(condicion instanceof Date) && !Prisma.Decimal.isDecimal(condicion)) {
      return Object.entries(condicion).every(([operador, referencia]: [string, any]) => {
        switch (operador) {
          case 'gt': return valor > referencia;
          case 'gte': return valor >= referencia;
          case 'lt': return valor < referencia;
          case 'lte': return valor <= referencia;
          case 'in': return referencia.includes(valor);
          case 'not': return valor !== referencia;
          default: throw new Error(`Operador no soportado en la prueba: ${operador}`);
        }
      });
    }
    return valor === condicion;
  });
}

function ordenar(registros: Registro[], orderBy?: Registro): Registro[] {
  if (!orderBy) return registros;
  const [[campo, direccion]] = Object.entries(orderBy);
  return [...registros].sort((a, b) => (a[campo] < b[campo] ? -1 : a[campo] > b[campo] ? 1 : 0) * (direccion === 'desc' ? -1 : 1));
}

function errorUnico(campo: string) {
  return new Prisma.PrismaClientKnownRequestError(`Unique constraint failed on ${campo}`, { code: 'P2002', clientVersion: 'prueba' });
}

export class PrismaEnMemoria {
  tablas: Tablas = {
    usuario: [], servicio: [], solicitud: [], asignacion: [], pago: [], wallet: [], movimientoWallet: [], liquidacion: [], notificacion: [],
  };
  private secuencias = { movimientoWallet: 0, liquidacion: 0 };
  /** Consultas de bloqueo (SELECT … FOR UPDATE) ejecutadas. */
  bloqueos: unknown[] = [];

  usuario = this.delegado('usuario');
  servicio = this.delegado('servicio');
  asignacion = this.delegado('asignacion');
  pago = this.delegado('pago');
  wallet = this.delegado('wallet');
  movimientoWallet = this.delegado('movimientoWallet');
  liquidacion = this.delegado('liquidacion');
  notificacion = this.delegado('notificacion');
  solicitud = {
    ...this.delegado('solicitud'),
    findUnique: async ({ where, include }: Registro) => {
      const solicitud = this.tablas.solicitud.find((s) => cumple(s, where));
      if (!solicitud) return null;
      if (!include) return { ...solicitud };
      return {
        ...solicitud,
        pago: this.tablas.pago.find((p) => p.solicitudId === solicitud.id) ?? null,
        asignacion: this.tablas.asignacion.find((a) => a.solicitudId === solicitud.id) ?? null,
        servicio: this.tablas.servicio.find((s) => s.id === solicitud.servicioId) ?? null,
      };
    },
  };

  async $queryRaw(...argumentos: unknown[]) {
    this.bloqueos.push(argumentos);
    return [];
  }

  async $transaction<T>(operacion: (tx: this) => Promise<T>): Promise<T> {
    // Copia superficial por registro: Decimal y Date no se modifican en el lugar.
    const respaldo = {
      tablas: Object.fromEntries(Object.entries(this.tablas).map(([nombre, registros]) => [nombre, registros.map((r) => ({ ...r }))])) as Tablas,
      secuencias: { ...this.secuencias },
    };
    try {
      return await operacion(this);
    } catch (error) {
      this.tablas = respaldo.tablas;
      this.secuencias = respaldo.secuencias;
      throw error;
    }
  }

  private delegado(nombre: keyof Tablas) {
    const tabla = () => this.tablas[nombre];
    const validarUnicos = (registro: Registro, ignorar?: Registro) => {
      for (const campo of UNICOS[nombre] ?? []) {
        if (registro[campo] === null || registro[campo] === undefined) continue;
        if (tabla().some((otro) => otro !== ignorar && otro[campo] === registro[campo])) throw errorUnico(campo);
      }
    };
    const crear = (data: Registro) => {
      const registro: Registro = { id: nuevoId(nombre), ...data };
      if (nombre === 'movimientoWallet' || nombre === 'liquidacion') registro.numero = ++this.secuencias[nombre];
      if (nombre === 'movimientoWallet') registro.fecha ??= new Date();
      if (nombre === 'liquidacion') {
        registro.estado ??= 'PENDIENTE';
        registro.fechaCreacion ??= new Date();
      }
      if (nombre === 'wallet') {
        registro.saldo ??= new Prisma.Decimal(0);
        registro.fechaCreacion ??= new Date();
      }
      if (nombre === 'pago') registro.fecha ??= new Date();
      validarUnicos(registro);
      tabla().push(registro);
      return registro;
    };
    const actualizar = (registro: Registro, data: Registro) => {
      if (nombre === 'movimientoWallet') throw new Error('Los movimientos de wallet son inmutables.');
      const nuevo = { ...registro, ...data };
      validarUnicos(nuevo, registro);
      Object.assign(registro, data);
      return registro;
    };
    const buscar = (where: Registro) => tabla().find((registro) => cumple(registro, where));
    // Relación usada por los servicios: liquidacion.wallet.personalId.
    const copia = (registro: Registro): Registro => {
      if (nombre !== 'liquidacion') return { ...registro };
      const wallet = this.tablas.wallet.find((w) => w.id === registro.walletId);
      return { ...registro, wallet: { personalId: wallet?.personalId, personal: this.tablas.usuario.find((u) => u.id === wallet?.personalId) } };
    };

    return {
      findUnique: async ({ where }: Registro) => (buscar(where) ? copia(buscar(where)!) : null),
      findUniqueOrThrow: async ({ where }: Registro) => {
        const registro = buscar(where);
        if (!registro) throw new Error(`${nombre} no encontrado`);
        return copia(registro);
      },
      findFirst: async ({ where, orderBy }: Registro = {}) => {
        const registro = ordenar(tabla().filter((r) => cumple(r, where)), orderBy)[0];
        return registro ? copia(registro) : null;
      },
      findMany: async ({ where, orderBy }: Registro = {}) => ordenar(tabla().filter((r) => cumple(r, where)), orderBy).map(copia),
      count: async ({ where }: Registro = {}) => tabla().filter((r) => cumple(r, where)).length,
      create: async ({ data }: Registro) => copia(crear(data)),
      upsert: async ({ where, create }: Registro) => copia(buscar(where) ?? crear(create)),
      update: async ({ where, data }: Registro) => {
        const registro = buscar(where);
        if (!registro) throw new Error(`${nombre} no encontrado`);
        return copia(actualizar(registro, data));
      },
      updateMany: async ({ where, data }: Registro) => {
        const registros = tabla().filter((r) => cumple(r, where));
        registros.forEach((registro) => actualizar(registro, data));
        return { count: registros.length };
      },
    };
  }

  // ─── Datos de prueba ────────────────────────────────────────────────────────

  crearUsuario(rol: 'CLIENTE' | 'PERSONAL_ASEO' | 'ADMINISTRADOR', id = nuevoId(rol.toLowerCase())) {
    this.tablas.usuario.push({ id, nombre: rol, apellido: 'Prueba', rol, estado: 'ACTIVO' });
    return id;
  }

  /** Crea una solicitud (con servicio y, opcionalmente, personal asignado). */
  crearSolicitud(opciones: { clienteId: string; personalId?: string; precio: number; estado?: string; metodoPago?: string }) {
    const servicioId = nuevoId('servicio');
    this.tablas.servicio.push({ id: servicioId, nombre: 'Limpieza general', precioBase: new Prisma.Decimal(opciones.precio), activo: true });
    const solicitudId = nuevoId('solicitud');
    this.tablas.solicitud.push({
      id: solicitudId,
      clienteId: opciones.clienteId,
      servicioId,
      estado: opciones.estado ?? 'ACEPTADO',
      metodoPago: opciones.metodoPago ?? 'EFECTIVO',
    });
    if (opciones.personalId) {
      this.tablas.asignacion.push({ id: nuevoId('asignacion'), solicitudId, personalId: opciones.personalId });
    }
    return solicitudId;
  }

  finalizar(solicitudId: string) {
    this.tablas.solicitud.find((s) => s.id === solicitudId)!.estado = 'FINALIZADO';
  }

  saldo(personalId: string): number {
    const wallet = this.tablas.wallet.find((w) => w.personalId === personalId);
    return wallet ? Number(wallet.saldo) : 0;
  }

  movimientosDe(personalId: string) {
    const wallet = this.tablas.wallet.find((w) => w.personalId === personalId);
    return this.tablas.movimientoWallet.filter((m) => m.walletId === wallet?.id).sort((a, b) => a.numero - b.numero);
  }
}
