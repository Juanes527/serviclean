import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class CrearServicioDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del servicio es obligatorio.' })
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'La descripción del servicio es obligatoria.' })
  descripcion: string;

  @IsNumber({}, { message: 'El precio base debe ser un número.' })
  @IsPositive({ message: 'El precio base debe ser mayor a cero.' })
  precioBase: number;

  @IsInt({ message: 'La duración debe ser un número entero de minutos.' })
  @Min(15, { message: 'La duración mínima es de 15 minutos.' })
  duracionMinutos: number;

  @IsOptional()
  @IsString()
  icono?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
