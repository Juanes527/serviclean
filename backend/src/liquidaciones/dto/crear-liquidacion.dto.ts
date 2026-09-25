import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CrearLiquidacionDto {
  @IsString()
  @IsNotEmpty({ message: 'Debe indicar el integrante del personal a liquidar.' })
  personalId: string;

  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'Las observaciones no pueden superar 300 caracteres.' })
  observaciones?: string;
}
