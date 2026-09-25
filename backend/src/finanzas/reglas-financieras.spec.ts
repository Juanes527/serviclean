import { aCentavos, aDecimal } from './dinero';
import {
  calcularDesgloseLiquidacion,
  calcularDistribucion,
  efectosEnWallet,
  generarReferenciaPago,
  porcentajeComisionServiClean,
} from './reglas-financieras';

describe('Reglas financieras', () => {
  const variableOriginal = process.env.COMISION_SERVICLEAN_PORCENTAJE;
  afterEach(() => {
    if (variableOriginal === undefined) delete process.env.COMISION_SERVICLEAN_PORCENTAJE;
    else process.env.COMISION_SERVICLEAN_PORCENTAJE = variableOriginal;
  });

  it('reparte un servicio de $50.000 en $10.000 para ServiClean y $40.000 para el personal', () => {
    delete process.env.COMISION_SERVICLEAN_PORCENTAJE;
    const distribucion = calcularDistribucion(aCentavos(50000));

    expect(distribucion.porcentajeComision).toBe(20);
    expect(distribucion.porcentajePersonal).toBe(80);
    expect(distribucion.comisionCentavos).toBe(1_000_000);
    expect(distribucion.personalCentavos).toBe(4_000_000);
  });

  it('toma el porcentaje de la configuración central', () => {
    process.env.COMISION_SERVICLEAN_PORCENTAJE = '15';
    expect(porcentajeComisionServiClean()).toBe(15);
    expect(calcularDistribucion(aCentavos(100000)).personalCentavos).toBe(8_500_000);
  });

  it('rechaza porcentajes inválidos', () => {
    process.env.COMISION_SERVICLEAN_PORCENTAJE = '120';
    expect(() => porcentajeComisionServiClean()).toThrow();
  });

  it('comisión + parte del personal siempre suman el valor exacto, sin errores de redondeo', () => {
    for (const monto of [33333.33, 0.01, 12345.67, 99999.99]) {
      const distribucion = calcularDistribucion(aCentavos(monto), 17.5);
      expect(distribucion.comisionCentavos + distribucion.personalCentavos).toBe(aCentavos(monto));
      expect(Number.isInteger(distribucion.comisionCentavos)).toBe(true);
    }
  });

  it('convierte entre pesos y centavos sin usar punto flotante', () => {
    expect(aCentavos('0.1') + aCentavos('0.2')).toBe(aCentavos('0.3'));
    expect(aDecimal(4_000_000).toString()).toBe('40000');
    expect(aCentavos(aDecimal(-1_050))).toBe(-1_050);
  });

  it('tarjeta: un único ingreso por la parte del personal', () => {
    const efectos = efectosEnWallet('SIMULADO_TARJETA', calcularDistribucion(aCentavos(50000), 20));
    expect(efectos).toEqual([{ tipo: 'INGRESO_SERVICIO', montoCentavos: 4_000_000, sufijoClave: 'INGRESO' }]);
  });

  it('efectivo: ingreso de la parte del personal y débito del efectivo recibido (neto = −comisión)', () => {
    const efectos = efectosEnWallet('EFECTIVO', calcularDistribucion(aCentavos(50000), 20));
    expect(efectos.map((efecto) => efecto.montoCentavos)).toEqual([4_000_000, -5_000_000]);
    expect(efectos.reduce((suma, efecto) => suma + efecto.montoCentavos, 0)).toBe(-1_000_000);
  });

  it('calcula el desglose de una liquidación: saldo inicial + ingresos − descuentos + ajustes', () => {
    const desglose = calcularDesgloseLiquidacion(aCentavos(50000), [
      { tipo: 'INGRESO_SERVICIO', montoCentavos: aCentavos(120000) },
      { tipo: 'PAGO_EFECTIVO', montoCentavos: -aCentavos(15000) },
      { tipo: 'DESCUENTO', montoCentavos: -aCentavos(5000) },
      { tipo: 'AJUSTE', montoCentavos: aCentavos(10000) },
    ]);
    expect(desglose.ingresosCentavos).toBe(aCentavos(120000));
    expect(desglose.descuentosCentavos).toBe(aCentavos(20000));
    expect(desglose.ajustesCentavos).toBe(aCentavos(10000));
    expect(desglose.totalCentavos).toBe(aCentavos(160000));
  });

  it('genera referencias de pago únicas con formato PAY-XXXXXXXXXX', () => {
    const referencias = new Set(Array.from({ length: 200 }, generarReferenciaPago));
    expect(referencias.size).toBe(200);
    [...referencias].forEach((referencia) => expect(referencia).toMatch(/^PAY-[0-9A-F]{10}$/));
  });
});
