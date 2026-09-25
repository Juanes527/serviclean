import { MarcaTarjeta } from '@/tipos';

/**
 * Utilidades del formulario de PAGO SIMULADO.
 *
 * Todo se valida en el navegador. Hacia el backend solo salen los últimos 4 dígitos y la marca:
 * el número completo, el vencimiento y el CVV nunca se envían, no se guardan en el navegador
 * y no se registran en consola.
 */

export const TEXTO_MARCA: Record<MarcaTarjeta, string> = {
  VISA: 'Visa',
  MASTERCARD: 'Mastercard',
  AMEX: 'American Express',
  DINERS: 'Diners Club',
  OTRA: 'Tarjeta',
};

export function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

export function detectarMarca(numero: string): MarcaTarjeta {
  const digitos = soloDigitos(numero);
  if (/^4/.test(digitos)) return 'VISA';
  if (/^(5[1-5]|2[2-7])/.test(digitos)) return 'MASTERCARD';
  if (/^3[47]/.test(digitos)) return 'AMEX';
  if (/^3(0[0-5]|[68])/.test(digitos)) return 'DINERS';
  return 'OTRA';
}

/** "4242424242424242" → "4242 4242 4242 4242" (AMEX: 4-6-5). */
export function formatearNumeroTarjeta(valor: string): string {
  const digitos = soloDigitos(valor).slice(0, 19);
  if (detectarMarca(digitos) === 'AMEX') {
    return [digitos.slice(0, 4), digitos.slice(4, 10), digitos.slice(10, 15)].filter(Boolean).join(' ');
  }
  return digitos.replace(/(.{4})/g, '$1 ').trim();
}

/** "1230" → "12/30". */
export function formatearVencimiento(valor: string): string {
  const digitos = soloDigitos(valor).slice(0, 4);
  return digitos.length > 2 ? `${digitos.slice(0, 2)}/${digitos.slice(2)}` : digitos;
}

export interface DatosTarjeta {
  numero: string;
  titular: string;
  vencimiento: string;
  cvv: string;
}

export type ErroresTarjeta = Partial<Record<keyof DatosTarjeta, string>>;

/** Valida solo el formato: en la simulación cualquier tarjeta con formato válido se aprueba. */
export function validarTarjeta(datos: DatosTarjeta, hoy = new Date()): ErroresTarjeta {
  const errores: ErroresTarjeta = {};
  const numero = soloDigitos(datos.numero);
  if (numero.length < 13 || numero.length > 19) errores.numero = 'Ingresa un número de tarjeta de 13 a 19 dígitos.';

  const titular = datos.titular.trim();
  if (titular.length < 3) errores.titular = 'Ingresa el nombre como aparece en la tarjeta.';
  else if (!/^[\p{L} .'-]+$/u.test(titular)) errores.titular = 'El nombre solo puede contener letras.';

  const coincidencia = /^(\d{2})\/(\d{2})$/.exec(datos.vencimiento);
  if (!coincidencia) {
    errores.vencimiento = 'Usa el formato MM/AA.';
  } else {
    const mes = Number(coincidencia[1]);
    const anio = 2000 + Number(coincidencia[2]);
    if (mes < 1 || mes > 12) errores.vencimiento = 'El mes no es válido.';
    else if (anio < hoy.getFullYear() || (anio === hoy.getFullYear() && mes < hoy.getMonth() + 1)) {
      errores.vencimiento = 'La tarjeta está vencida.';
    }
  }

  const largoCvv = detectarMarca(numero) === 'AMEX' ? 4 : 3;
  if (soloDigitos(datos.cvv).length !== largoCvv) errores.cvv = `El CVV debe tener ${largoCvv} dígitos.`;
  return errores;
}
