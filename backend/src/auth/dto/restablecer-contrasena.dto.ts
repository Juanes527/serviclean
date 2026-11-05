import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RestablecerContrasenaDto {
  @IsString()
  @IsNotEmpty({ message: 'El enlace de recuperación no es válido.' })
  tokenHash: string;

  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  nuevaContrasena: string;
}
