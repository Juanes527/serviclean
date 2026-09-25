import { IsEmail } from 'class-validator';

export class RecuperarContrasenaDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  correo: string;
}
