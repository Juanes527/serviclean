import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const OPCIONES_SERVIDOR = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
} as const;

/**
 * Clientes de Supabase Auth para el backend. El navegador nunca habla con Supabase: el backend
 * intermedia todas las operaciones y guarda la sesión en cookies HttpOnly.
 */
@Injectable()
export class SupabaseService {
  private readonly url: string;
  private readonly clavePublica: string;
  /** Cliente con la clave secreta (service role): administración de usuarios. Nunca se expone. */
  readonly admin: SupabaseClient;

  constructor(configService: ConfigService) {
    this.url = configService.getOrThrow<string>('SUPABASE_URL');
    this.clavePublica = configService.getOrThrow<string>('SUPABASE_PUBLISHABLE_KEY');
    this.admin = createClient(this.url, configService.getOrThrow<string>('SUPABASE_SECRET_KEY'), OPCIONES_SERVIDOR);
  }

  /**
   * Cliente con la clave pública para operaciones del usuario (login, registro, verificación).
   * Se crea uno por operación porque el cliente guarda en memoria la sesión de la última llamada.
   */
  publico(): SupabaseClient {
    return createClient(this.url, this.clavePublica, OPCIONES_SERVIDOR);
  }
}
