import { IsNotEmpty, MinLength } from 'class-validator';

export class RestablecerContrasenaDto {
  @IsNotEmpty({ message: 'El token de recuperación es obligatorio.' })
  token: string;

  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  nuevaContrasena: string;
}
