import { IsNotEmpty, IsString } from 'class-validator';

export class VerificarCorreoDto {
  @IsString()
  @IsNotEmpty({ message: 'El enlace de verificación no es válido.' })
  tokenHash: string;
}
