import { IsIn } from 'class-validator';

/** Verificación de pagos históricos pendientes (Nequi / transferencia). */
export class ActualizarEstadoPagoDto {
  @IsIn(['PAGADO', 'CANCELADO'], { message: 'El estado del pago no es válido.' })
  estado: 'PAGADO' | 'CANCELADO';
}
