import { IsNotEmpty } from 'class-validator';

export class ReasignarDto {
  @IsNotEmpty({ message: 'Debe seleccionar un integrante del personal.' })
  personalId: string;
}
