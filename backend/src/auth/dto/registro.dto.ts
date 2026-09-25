import { IsEmail, IsIn, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class RegistroDto {
  @IsString({ message: 'El nombre es obligatorio.' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  nombre: string;

  @IsString({ message: 'El apellido es obligatorio.' })
  @IsNotEmpty({ message: 'El apellido es obligatorio.' })
  apellido: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  correo: string;

  @IsString()
  @Matches(/^[0-9+ ]{7,15}$/, { message: 'El teléfono no es válido.' })
  telefono: string;

  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  contrasena: string;

  @IsString({ message: 'Debe confirmar la contraseña.' })
  confirmarContrasena: string;

  @IsIn(['CLIENTE', 'PERSONAL_ASEO'], { message: 'El tipo de usuario seleccionado no es válido.' })
  rol: 'CLIENTE' | 'PERSONAL_ASEO';
}
