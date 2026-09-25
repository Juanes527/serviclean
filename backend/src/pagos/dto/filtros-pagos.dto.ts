import { EstadoPago, MetodoPago } from '@prisma/client';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class FiltrosPagosDto {
  @IsOptional()
  @IsIn(Object.values(MetodoPago), { message: 'El método de pago no es válido.' })
  metodo?: MetodoPago;

  @IsOptional()
  @IsIn(Object.values(EstadoPago), { message: 'El estado del pago no es válido.' })
  estado?: EstadoPago;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha inicial no es válida.' })
  desde?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha final no es válida.' })
  hasta?: string;

  @IsOptional()
  @IsString()
  personalId?: string;

  @IsOptional()
  @IsString()
  solicitudId?: string;
}
