import { Prisma } from '@prisma/client';

/**
 * Utilidades de dinero. Todos los cálculos se hacen en CENTAVOS (enteros) para evitar
 * errores de punto flotante; en la base de datos el dinero se guarda como Decimal(…, 2).
 */

type ValorMonetario = Prisma.Decimal | number | string | null | undefined;

/** Convierte un valor en pesos (Decimal, número o texto) a centavos enteros. */
export function aCentavos(valor: ValorMonetario): number {
  if (valor === null || valor === undefined) return 0;
  const centavos = new Prisma.Decimal(valor).mul(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toNumber();
  if (!Number.isSafeInteger(centavos)) {
    throw new Error('El monto excede el rango permitido.');
  }
  return centavos;
}

/** Convierte centavos enteros a Decimal en pesos, listo para guardar con Prisma. */
export function aDecimal(centavos: number): Prisma.Decimal {
  if (!Number.isSafeInteger(centavos)) {
    throw new Error('Los montos en centavos deben ser enteros.');
  }
  return new Prisma.Decimal(centavos).div(100);
}

/** Centavos a pesos como número, para respuestas de reportes (solo presentación). */
export function aPesos(centavos: number): number {
  return centavos / 100;
}

/** "$50.000" — para mensajes de error y notificaciones. */
export function formatearPesos(centavos: number): string {
  const pesos = Math.abs(centavos) / 100;
  const texto = pesos.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${centavos < 0 ? '-' : ''}$${texto}`;
}

export function sumarCentavos(valores: ValorMonetario[]): number {
  return valores.reduce<number>((total, valor) => total + aCentavos(valor), 0);
}
