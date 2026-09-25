import { IsIn } from 'class-validator';

export class ActualizarEstadoDto {
  @IsIn(['ACTIVO', 'INACTIVO'], { message: 'El estado no es válido.' })
  estado: 'ACTIVO' | 'INACTIVO';
}
