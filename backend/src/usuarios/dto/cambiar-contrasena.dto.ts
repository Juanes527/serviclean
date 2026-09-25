import { IsNotEmpty, MinLength } from 'class-validator';

export class CambiarContrasenaDto {
  @IsNotEmpty({ message: 'Debe ingresar su contraseña actual.' })
  contrasenaActual: string;

  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres.' })
  nuevaContrasena: string;

  @IsNotEmpty({ message: 'Debe confirmar la nueva contraseña.' })
  confirmarContrasena: string;
}
