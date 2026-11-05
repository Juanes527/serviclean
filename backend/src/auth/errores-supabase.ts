import { BadRequestException, ConflictException, HttpException, HttpStatus } from '@nestjs/common';
import type { AuthError } from '@supabase/supabase-js';

/** Traduce los errores de Supabase Auth que el usuario puede corregir; el resto usa `mensajePorDefecto`. */
export function errorDeSupabase(error: AuthError, mensajePorDefecto: string): HttpException {
  switch (error.code) {
    case 'user_already_exists':
    case 'email_exists':
      return new ConflictException('Ya existe un usuario con este correo.');
    case 'weak_password':
      return new BadRequestException('La contraseña es muy débil. Usa al menos 8 caracteres combinando letras y números.');
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return new HttpException('Se hicieron demasiados intentos. Espera unos minutos e inténtalo de nuevo.', HttpStatus.TOO_MANY_REQUESTS);
    default:
      return new BadRequestException(mensajePorDefecto);
  }
}
