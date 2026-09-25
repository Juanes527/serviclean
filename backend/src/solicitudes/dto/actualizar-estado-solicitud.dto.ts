import { IsIn, IsOptional, IsString } from 'class-validator';

export class ActualizarEstadoSolicitudDto {
  @IsIn(['EN_PROCESO', 'FINALIZADO', 'CANCELADO'], { message: 'El estado indicado no es válido.' })
  estado: 'EN_PROCESO' | 'FINALIZADO' | 'CANCELADO';

  @IsOptional()
  @IsString()
  observaciones?: string;
}
