import { TipoMovimientoWallet } from '@prisma/client';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class FiltrosMovimientosDto {
  @IsOptional()
  @IsIn(Object.values(TipoMovimientoWallet), { message: 'El tipo de movimiento no es válido.' })
  tipo?: TipoMovimientoWallet;

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
