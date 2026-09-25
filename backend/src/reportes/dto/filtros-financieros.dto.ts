import { MetodoPago } from '@prisma/client';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class FiltrosFinancierosDto {
  @IsOptional()
  @IsDateString({}, { message: 'La fecha inicial no es válida.' })
  desde?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha final no es válida.' })
  hasta?: string;

  @IsOptional()
  @IsIn(['mes', 'semana'], { message: 'La agrupación debe ser "mes" o "semana".' })
  agrupacion?: 'mes' | 'semana';
}

export class FiltrosFlujoDto {
  @IsOptional()
  @IsDateString({}, { message: 'La fecha inicial no es válida.' })
  desde?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha final no es válida.' })
  hasta?: string;

  @IsOptional()
  @IsIn(['INGRESO', 'EGRESO'], { message: 'El tipo debe ser INGRESO o EGRESO.' })
  tipo?: 'INGRESO' | 'EGRESO';

  @IsOptional()
  @IsIn(Object.values(MetodoPago), { message: 'El método de pago no es válido.' })
  metodo?: MetodoPago;

  @IsOptional()
  @IsIn(['PENDIENTE', 'PAGADO', 'CANCELADO', 'REEMBOLSADO', 'PAGADA', 'CANCELADA'], { message: 'El estado no es válido.' })
  estado?: string;

  @IsOptional()
  @IsString()
  personalId?: string;

  @IsOptional()
  @IsString()
  solicitudId?: string;
}
