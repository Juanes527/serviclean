import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class ActualizarPerfilDto {
  @IsString({ message: 'El nombre es obligatorio.' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  nombre: string;

  @IsString({ message: 'El apellido es obligatorio.' })
  @IsNotEmpty({ message: 'El apellido es obligatorio.' })
  apellido: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  correo: string;

  @Matches(/^[0-9+ ]{7,15}$/, { message: 'El teléfono no es válido.' })
  telefono: string;
}
