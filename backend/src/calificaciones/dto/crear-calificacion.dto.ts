import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CrearCalificacionDto {
  @IsNotEmpty({ message: 'Debe indicar la solicitud a calificar.' })
  solicitudId: string;

  @IsInt({ message: 'La puntuación debe ser un número entero.' })
  @Min(1, { message: 'La puntuación mínima es 1.' })
  @Max(5, { message: 'La puntuación máxima es 5.' })
  puntuacion: number;

  @IsOptional()
  @IsString()
  comentario?: string;
}
