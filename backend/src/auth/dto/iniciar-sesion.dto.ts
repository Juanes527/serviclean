import { IsEmail, IsNotEmpty } from 'class-validator';

export class IniciarSesionDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  correo: string;

  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  contrasena: string;
}
