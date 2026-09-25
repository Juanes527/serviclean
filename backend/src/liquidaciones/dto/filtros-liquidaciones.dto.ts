import { EstadoLiquidacion } from '@prisma/client';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class FiltrosLiquidacionesDto {
  @IsOptional()
  @IsIn(Object.values(EstadoLiquidacion), { message: 'El estado de la liquidación no es válido.' })
  estado?: EstadoLiquidacion;

  @IsOptional()
  @IsString()
  personalId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha inicial no es válida.' })
  desde?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha final no es válida.' })
  hasta?: string;
}
