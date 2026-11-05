import { MetodoPago, PrismaClient, Servicio, TipoMovimientoWallet, Usuario } from '@prisma/client';
import { asegurarCuenta, clienteAdminSupabase, cuentasExistentes } from './cuentas-supabase';
import { aCentavos, aDecimal, formatearPesos } from '../src/finanzas/dinero';
import {
  calcularDesgloseLiquidacion,
  calcularDistribucion,
  efectosEnWallet,
  generarReferenciaPago,
  referenciaLiquidacion,
  referenciaServicio,
  TEXTO_METODO,
} from '../src/finanzas/reglas-financieras';

const prisma = new PrismaClient();

/** Fecha a medianoche UTC desplazada `dias` desde hoy (negativo = pasado). */
const fechaRelativa = (dias: number, horas = 0) => {
  const hoy = new Date();
  const fecha = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()));
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  fecha.setUTCHours(horas);
  return fecha;
};

// ─── Ledger del seed ─────────────────────────────────────────────────────────
// Replica las reglas del backend (src/finanzas) para que los saldos sean coherentes con su historial.

const saldos = new Map<string, number>(); // walletId → saldo en centavos

async function registrarMovimiento(datos: {
  walletId: string;
  tipo: TipoMovimientoWallet;
  montoCentavos: number;
  concepto: string;
  fecha: Date;
  solicitudId?: string;
  pagoId?: string;
  liquidacionId?: string;
  autorizadoPorId?: string;
  claveIdempotencia?: string;
  metadata?: object;
}) {
  const saldoAnterior = saldos.get(datos.walletId) ?? 0;
  const saldoPosterior = saldoAnterior + datos.montoCentavos;
  saldos.set(datos.walletId, saldoPosterior);
  const { montoCentavos, ...resto } = datos;
  const movimiento = await prisma.movimientoWallet.create({
    data: { ...resto, monto: aDecimal(montoCentavos), saldoAnterior: aDecimal(saldoAnterior), saldoPosterior: aDecimal(saldoPosterior) },
  });
  await prisma.wallet.update({ where: { id: datos.walletId }, data: { saldo: aDecimal(saldoPosterior) } });
  return movimiento;
}

async function main() {
  // Las cuentas de prueba viven en Supabase Auth (contraseña Prueba123). Si ya existen, se reutilizan
  // sin cambiar su contraseña: el proyecto de Supabase es compartido con producción.
  const supabase = clienteAdminSupabase();
  const existentes = await cuentasExistentes(supabase);
  const cuentaDePrueba = async (correo: string) =>
    (await asegurarCuenta(supabase, existentes, correo, { contrasena: 'Prueba123' })).authId;

  // TRUNCATE (no DELETE): los movimientos de wallet son inmutables y un trigger impide borrarlos fila por fila.
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "movimientos_wallet", "liquidaciones", "wallets", "calificaciones", "pagos", "asignaciones",
      "solicitudes", "disponibilidad", "notificaciones", "servicios", "usuarios"
    RESTART IDENTITY CASCADE
  `);

  const administrador = await prisma.usuario.create({
    data: {
      nombre: 'Juan',
      apellido: 'Parra',
      correo: 'admin@serviclean.com',
      authId: await cuentaDePrueba('admin@serviclean.com'),
      telefono: '3001234567',
      rol: 'ADMINISTRADOR',
    },
  });

  const clientes = await Promise.all(
    [
      { nombre: 'Camila', apellido: 'Rojas', correo: 'camila.cliente@serviclean.com' },
      { nombre: 'Juan', apellido: 'Pérez', correo: 'juan.cliente@serviclean.com' },
      { nombre: 'Ana', apellido: 'Torres', correo: 'ana.cliente@serviclean.com' },
    ].map(async (datos, indice) =>
      prisma.usuario.create({
        data: { ...datos, authId: await cuentaDePrueba(datos.correo), telefono: `310000000${indice + 1}`, rol: 'CLIENTE' },
      }),
    ),
  );

  const personal = await Promise.all(
    [
      { nombre: 'Marcela', apellido: 'Ibarra', correo: 'marcela.personal@serviclean.com' },
      { nombre: 'Pedro', apellido: 'Salazar', correo: 'pedro.personal@serviclean.com' },
      { nombre: 'Rosa', apellido: 'Fandiño', correo: 'rosa.personal@serviclean.com' },
    ].map(async (datos, indice) =>
      prisma.usuario.create({
        data: { ...datos, authId: await cuentaDePrueba(datos.correo), telefono: `320000000${indice + 1}`, rol: 'PERSONAL_ASEO', fechaCreacion: fechaRelativa(-60) },
      }),
    ),
  );
  const [marcela, pedro, rosa] = personal;

  const wallets = new Map<string, string>(); // personalId → walletId
  for (const integrante of personal) {
    const wallet = await prisma.wallet.create({ data: { personalId: integrante.id, fechaCreacion: fechaRelativa(-45) } });
    wallets.set(integrante.id, wallet.id);
  }

  const [general, profunda, cocina, banos] = await Promise.all(
    [
      { nombre: 'Limpieza general', descripcion: 'Limpieza completa de todas las áreas del hogar.', precioBase: 80000, duracionMinutos: 180, icono: 'home' },
      { nombre: 'Limpieza profunda', descripcion: 'Limpieza detallada incluyendo zonas de difícil acceso.', precioBase: 140000, duracionMinutos: 300, icono: 'sparkles' },
      { nombre: 'Limpieza de cocina', descripcion: 'Desengrase y limpieza de electrodomésticos y superficies de cocina.', precioBase: 50000, duracionMinutos: 90, icono: 'utensils' },
      { nombre: 'Limpieza de baños', descripcion: 'Desinfección y limpieza completa de baños.', precioBase: 40000, duracionMinutos: 60, icono: 'droplet' },
    ].map((datos) => prisma.servicio.create({ data: datos })),
  );

  await Promise.all(
    personal.flatMap((integrante) =>
      [1, 2].map((dias) =>
        prisma.disponibilidad.create({ data: { personalId: integrante.id, fecha: fechaRelativa(dias), horaInicio: '08:00', horaFin: '17:00' } }),
      ),
    ),
  );

  const direcciones = ['Calle 10 # 5-20, Bogotá', 'Carrera 15 # 100-30, Bogotá', 'Avenida 68 # 40-15, Bogotá'];

  /** Solicitud (con asignación opcional) sin efectos financieros. */
  async function crearSolicitud(opciones: {
    cliente: Usuario;
    servicio: Servicio;
    dias: number;
    hora?: string;
    metodo: MetodoPago;
    estado: 'PENDIENTE' | 'ASIGNADO' | 'ACEPTADO' | 'EN_PROCESO' | 'FINALIZADO' | 'CANCELADO';
    personal?: Usuario;
  }) {
    const indiceCliente = clientes.findIndex((cliente) => cliente.id === opciones.cliente.id);
    const solicitud = await prisma.solicitud.create({
      data: {
        clienteId: opciones.cliente.id,
        servicioId: opciones.servicio.id,
        fecha: fechaRelativa(opciones.dias),
        hora: opciones.hora ?? '09:00',
        direccion: direcciones[indiceCliente],
        telefono: opciones.cliente.telefono,
        metodoPago: opciones.metodo,
        estado: opciones.estado,
        fechaCreacion: fechaRelativa(opciones.dias - 3, 14),
      },
    });
    if (opciones.personal) {
      await prisma.asignacion.create({
        data: { solicitudId: solicitud.id, personalId: opciones.personal.id, fechaAsignacion: fechaRelativa(opciones.dias - 3, 15) },
      });
    }
    return solicitud;
  }

  /** Pago simulado o en efectivo con su distribución (sin datos sensibles de tarjeta). */
  async function crearPago(solicitudId: string, cliente: Usuario, servicio: Servicio, metodo: MetodoPago, fecha: Date, estado: 'PAGADO' | 'REEMBOLSADO' = 'PAGADO') {
    const distribucion = calcularDistribucion(aCentavos(servicio.precioBase));
    const esTarjeta = metodo === 'SIMULADO_TARJETA';
    const tarjetas = [
      { tarjetaUltimos4: '4242', tarjetaMarca: 'VISA' },
      { tarjetaUltimos4: '5454', tarjetaMarca: 'MASTERCARD' },
      { tarjetaUltimos4: '0005', tarjetaMarca: 'AMEX' },
    ];
    const pago = await prisma.pago.create({
      data: {
        referencia: generarReferenciaPago(),
        solicitudId,
        clienteId: cliente.id,
        monto: aDecimal(distribucion.montoCentavos),
        metodo,
        estado,
        porcentajeComision: distribucion.porcentajeComision,
        montoComision: aDecimal(distribucion.comisionCentavos),
        montoPersonal: aDecimal(distribucion.personalCentavos),
        ...(esTarjeta ? tarjetas[clientes.findIndex((c) => c.id === cliente.id)] : {}),
        fecha,
      },
    });
    return { pago, distribucion };
  }

  /** Servicio finalizado y pagado: crea solicitud, pago y los movimientos que genera en la wallet. */
  async function servicioFinalizado(integrante: Usuario, cliente: Usuario, servicio: Servicio, dias: number, metodo: MetodoPago) {
    const solicitud = await crearSolicitud({ cliente, servicio, dias, metodo, estado: 'FINALIZADO', personal: integrante });
    const fechaPago = metodo === 'EFECTIVO' ? fechaRelativa(dias, 17) : fechaRelativa(dias - 2, 16);
    const { pago, distribucion } = await crearPago(solicitud.id, cliente, servicio, metodo, fechaPago);
    const referencia = referenciaServicio(solicitud.id);
    const conceptos = {
      INGRESO: `Servicio ${referencia} · ${servicio.nombre} (${TEXTO_METODO[metodo]})`,
      EFECTIVO: `Efectivo recibido del cliente · servicio ${referencia}`,
    };
    for (const efecto of efectosEnWallet(metodo, distribucion)) {
      await registrarMovimiento({
        walletId: wallets.get(integrante.id)!,
        tipo: efecto.tipo,
        montoCentavos: efecto.montoCentavos,
        concepto: conceptos[efecto.sufijoClave],
        fecha: fechaRelativa(dias, 18),
        solicitudId: solicitud.id,
        pagoId: pago.id,
        claveIdempotencia: `PAGO:${pago.id}:${efecto.sufijoClave}`,
        metadata: { metodo, referenciaPago: pago.referencia, montoServicio: distribucion.montoCentavos / 100 },
      });
    }
    return solicitud;
  }

  async function ajuste(integrante: Usuario, tipo: 'AJUSTE' | 'BONIFICACION' | 'DESCUENTO', pesos: number, concepto: string, dias: number) {
    await registrarMovimiento({
      walletId: wallets.get(integrante.id)!,
      tipo,
      montoCentavos: tipo === 'DESCUENTO' ? -Math.abs(aCentavos(pesos)) : aCentavos(pesos),
      concepto,
      fecha: fechaRelativa(dias, 12),
      autorizadoPorId: administrador.id,
    });
  }

  /** Liquidación del saldo acumulado desde la liquidación anterior; opcionalmente pagada. */
  async function liquidar(integrante: Usuario, dias: number, pagada: boolean) {
    const walletId = wallets.get(integrante.id)!;
    const anterior = await prisma.movimientoWallet.findFirst({ where: { walletId, tipo: 'LIQUIDACION' }, orderBy: { numero: 'desc' } });
    const movimientos = await prisma.movimientoWallet.findMany({ where: { walletId, numero: { gt: anterior?.numero ?? 0 } }, orderBy: { numero: 'asc' } });
    const desglose = calcularDesgloseLiquidacion(
      anterior ? aCentavos(anterior.saldoPosterior) : 0,
      movimientos.map((m) => ({ tipo: m.tipo, montoCentavos: aCentavos(m.monto) })),
    );
    const liquidacion = await prisma.liquidacion.create({
      data: {
        walletId,
        periodoInicio: anterior?.fecha ?? movimientos[0].fecha,
        periodoFin: fechaRelativa(dias, 8),
        saldoInicial: aDecimal(desglose.saldoInicialCentavos),
        ingresos: aDecimal(desglose.ingresosCentavos),
        descuentos: aDecimal(desglose.descuentosCentavos),
        ajustes: aDecimal(desglose.ajustesCentavos),
        monto: aDecimal(desglose.totalCentavos),
        movimientoDesde: anterior?.numero ?? 0,
        movimientoHasta: movimientos[movimientos.length - 1].numero,
        estado: pagada ? 'PAGADA' : 'PENDIENTE',
        creadaPorId: administrador.id,
        fechaCreacion: fechaRelativa(dias, 8),
        ...(pagada ? { pagadaPorId: administrador.id, fechaPago: fechaRelativa(dias, 10) } : {}),
      },
    });
    if (pagada) {
      await registrarMovimiento({
        walletId,
        tipo: 'LIQUIDACION',
        montoCentavos: -desglose.totalCentavos,
        concepto: `Liquidación ${referenciaLiquidacion(liquidacion.numero)}`,
        fecha: fechaRelativa(dias, 10),
        liquidacionId: liquidacion.id,
        autorizadoPorId: administrador.id,
        claveIdempotencia: `LIQUIDACION:${liquidacion.id}`,
      });
    }
    return liquidacion;
  }

  const [camila, juan, ana] = clientes;
  const T = MetodoPago.SIMULADO_TARJETA;
  const E = MetodoPago.EFECTIVO;

  // Marcela: casi siempre tarjeta → saldo disponible positivo, dos liquidaciones pagadas.
  await servicioFinalizado(marcela, camila, general, -40, T);
  await servicioFinalizado(marcela, juan, profunda, -38, T);
  await servicioFinalizado(marcela, ana, cocina, -35, E);
  await servicioFinalizado(marcela, camila, general, -33, T);
  await servicioFinalizado(marcela, juan, banos, -30, T);
  await liquidar(marcela, -28, true);
  await servicioFinalizado(marcela, ana, profunda, -25, T);
  await servicioFinalizado(marcela, camila, general, -21, E);
  await servicioFinalizado(marcela, juan, cocina, -18, T);
  await servicioFinalizado(marcela, ana, profunda, -14, T);
  await liquidar(marcela, -13, true);
  await servicioFinalizado(marcela, camila, general, -10, T);
  await servicioFinalizado(marcela, juan, banos, -7, E);
  await servicioFinalizado(marcela, ana, profunda, -5, T);
  await ajuste(marcela, 'BONIFICACION', 20000, 'Bonificación por calificación perfecta del mes', -4);
  const solicitudCalificada = await servicioFinalizado(marcela, camila, general, -3, T);

  // Pedro: casi siempre efectivo → saldo pendiente (negativo) con ServiClean.
  await servicioFinalizado(pedro, juan, general, -36, E);
  await servicioFinalizado(pedro, ana, profunda, -29, E);
  await servicioFinalizado(pedro, camila, cocina, -22, T);
  await servicioFinalizado(pedro, juan, profunda, -15, E);
  await servicioFinalizado(pedro, ana, general, -9, E);
  await ajuste(pedro, 'DESCUENTO', 10000, 'Reposición de implementos de aseo', -8);
  await servicioFinalizado(pedro, camila, banos, -6, T);
  await servicioFinalizado(pedro, juan, general, -2, E);

  // Rosa: pagos mixtos → una liquidación pagada y otra pendiente de pago.
  await servicioFinalizado(rosa, ana, cocina, -39, T);
  await servicioFinalizado(rosa, camila, general, -34, T);
  await servicioFinalizado(rosa, juan, banos, -27, E);
  await servicioFinalizado(rosa, ana, profunda, -26, T);
  await liquidar(rosa, -24, true);
  await servicioFinalizado(rosa, camila, general, -20, T);
  await servicioFinalizado(rosa, juan, cocina, -16, E);
  await servicioFinalizado(rosa, ana, profunda, -12, T);
  await servicioFinalizado(rosa, camila, general, -8, E);
  await ajuste(rosa, 'AJUSTE', 15000, 'Auxilio de transporte a zona rural', -7);
  await servicioFinalizado(rosa, juan, cocina, -4, T);
  await liquidar(rosa, -1, false);

  // Operación en curso (sin efecto en wallets todavía).
  await crearSolicitud({ cliente: juan, servicio: profunda, dias: 0, hora: '10:00', metodo: E, estado: 'EN_PROCESO', personal: pedro });
  await crearSolicitud({ cliente: ana, servicio: cocina, dias: 1, hora: '08:00', metodo: T, estado: 'PENDIENTE' });
  // Pagada por adelantado con tarjeta: se acreditará a Rosa cuando finalice el servicio.
  const prepagada = await crearSolicitud({ cliente: camila, servicio: banos, dias: 2, hora: '08:00', metodo: T, estado: 'ASIGNADO', personal: rosa });
  await crearPago(prepagada.id, camila, banos, T, fechaRelativa(-1, 19));
  // Finalizada y aún sin pagar: el cliente puede pagarla y el efecto en la wallet se aplica al instante.
  await crearSolicitud({ cliente: ana, servicio: general, dias: -1, hora: '14:00', metodo: E, estado: 'FINALIZADO', personal: marcela });
  // Cancelada tras pagar con tarjeta: el pago simulado quedó reembolsado.
  const cancelada = await crearSolicitud({ cliente: juan, servicio: cocina, dias: -11, metodo: T, estado: 'CANCELADO', personal: pedro });
  await crearPago(cancelada.id, juan, cocina, T, fechaRelativa(-13, 11), 'REEMBOLSADO');

  await prisma.calificacion.create({
    data: {
      solicitudId: solicitudCalificada.id,
      clienteId: camila.id,
      personalId: marcela.id,
      puntuacion: 5,
      comentario: 'Excelente servicio, muy puntual y detallada.',
    },
  });

  await prisma.notificacion.createMany({
    data: [
      { usuarioId: camila.id, mensaje: 'Tu servicio fue asignado a un integrante del personal de aseo.' },
      { usuarioId: juan.id, mensaje: 'Tu servicio se encuentra en proceso.' },
      { usuarioId: marcela.id, mensaje: 'Recibiste una nueva calificación de un cliente.' },
      { usuarioId: rosa.id, mensaje: 'Se generó tu liquidación L-0004. ServiClean la pagará próximamente.' },
      { usuarioId: pedro.id, mensaje: 'Tienes un saldo pendiente con ServiClean por servicios cobrados en efectivo.' },
    ],
  });

  // Verificación: cada wallet coincide con su último movimiento.
  for (const [walletId, saldo] of saldos) {
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { id: walletId } });
    if (aCentavos(wallet.saldo) !== saldo) throw new Error('El saldo de una wallet no coincide con su ledger.');
  }

  console.log('Datos de prueba creados correctamente.');
  console.log('----------------------------------------');
  console.log('Administrador: admin@serviclean.com / Prueba123');
  console.log('Clientes: camila.cliente@serviclean.com, juan.cliente@serviclean.com, ana.cliente@serviclean.com / Prueba123');
  console.log('Personal de aseo: marcela.personal@serviclean.com, pedro.personal@serviclean.com, rosa.personal@serviclean.com / Prueba123');
  console.log('Wallets:');
  for (const integrante of personal) {
    console.log(`  ${integrante.nombre}: ${formatearPesos(saldos.get(wallets.get(integrante.id)!) ?? 0)}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
