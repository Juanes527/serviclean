import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { METODOS_PAGO_VIGENTES, MetodoPagoVigente } from '../../finanzas/reglas-financieras';

export class CrearSolicitudDto {
  @IsNotEmpty({ message: 'Debe seleccionar un servicio.' })
  servicioId: string;

  @IsDateString({}, { message: 'Debe seleccionar una fecha válida.' })
  fecha: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Debe seleccionar una hora válida.' })
  hora: string;

  @IsString()
  @IsNotEmpty({ message: 'La dirección es obligatoria.' })
  direccion: string;

  @Matches(/^[0-9+ ]{7,15}$/, { message: 'El teléfono no es válido.' })
  telefono: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsIn(METODOS_PAGO_VIGENTES, { message: 'Debe seleccionar un método de pago válido: tarjeta simulada o efectivo.' })
  metodoPago: MetodoPagoVigente;
}
