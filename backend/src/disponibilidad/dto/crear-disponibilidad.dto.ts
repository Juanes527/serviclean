import { IsDateString, IsNotEmpty, Matches } from 'class-validator';

export class CrearDisponibilidadDto {
  @IsDateString({}, { message: 'Debe seleccionar una fecha válida.' })
  fecha: string;

  @IsNotEmpty({ message: 'Debe indicar la hora de inicio.' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'La hora de inicio no es válida.' })
  horaInicio: string;

  @IsNotEmpty({ message: 'Debe indicar la hora de fin.' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'La hora de fin no es válida.' })
  horaFin: string;
}
