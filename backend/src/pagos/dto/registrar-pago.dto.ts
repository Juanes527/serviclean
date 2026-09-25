import { IsIn, IsNotEmpty, Matches, ValidateIf } from 'class-validator';
import { MARCAS_TARJETA, METODOS_PAGO_VIGENTES, MetodoPagoVigente } from '../../finanzas/reglas-financieras';

/**
 * Datos para registrar un pago.
 *
 * SEGURIDAD: el pago con tarjeta es una SIMULACIÓN académica. El frontend valida el formulario
 * y envía únicamente datos no sensibles (últimos 4 dígitos y marca). Este DTO no tiene campos
 * para el número completo ni el CVV: si llegaran, el ValidationPipe global (whitelist) los descarta
 * antes de llegar al servicio, por lo que nunca se procesan, registran en logs ni almacenan.
 *
 * El monto no se recibe del cliente: se toma del precio del servicio en el backend.
 */
export class RegistrarPagoDto {
  @IsNotEmpty({ message: 'Debe indicar la solicitud a pagar.' })
  solicitudId: string;

  @IsIn(METODOS_PAGO_VIGENTES, { message: 'Debe seleccionar un método de pago válido: tarjeta simulada o efectivo.' })
  metodo: MetodoPagoVigente;

  @ValidateIf((datos: RegistrarPagoDto) => datos.metodo === 'SIMULADO_TARJETA')
  @Matches(/^\d{4}$/, { message: 'Los últimos 4 dígitos de la tarjeta no son válidos.' })
  tarjetaUltimos4?: string;

  @ValidateIf((datos: RegistrarPagoDto) => datos.metodo === 'SIMULADO_TARJETA')
  @IsIn(MARCAS_TARJETA, { message: 'La marca de la tarjeta no es válida.' })
  tarjetaMarca?: (typeof MARCAS_TARJETA)[number];
}
