import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Utilidades para scripts (seed e importación) que crean cuentas en Supabase Auth con la clave secreta.
 * La base de datos local y la de producción comparten el mismo proyecto de Supabase Auth, por eso una
 * cuenta se reutiliza si el correo ya existe allí.
 */
export function clienteAdminSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const claveSecreta = process.env.SUPABASE_SECRET_KEY;
  if (!url || !claveSecreta) {
    throw new Error('Faltan SUPABASE_URL y SUPABASE_SECRET_KEY en backend/.env.');
  }
  return createClient(url, claveSecreta, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Correo (en minúsculas) → id de las cuentas existentes en Supabase Auth. */
export async function cuentasExistentes(supabase: SupabaseClient): Promise<Map<string, string>> {
  const cuentas = new Map<string, string>();
  for (let pagina = 1; ; pagina++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: pagina, perPage: 1000 });
    if (error) throw error;
    for (const cuenta of data.users) {
      if (cuenta.email) cuentas.set(cuenta.email.toLowerCase(), cuenta.id);
    }
    if (data.users.length < 1000) return cuentas;
  }
}

/**
 * Devuelve el id de la cuenta del correo, creándola ya verificada si no existe. Se pasa la contraseña
 * en texto plano o un hash bcrypt existente (Supabase acepta hashes bcrypt al crear cuentas).
 * Si la cuenta ya existía, su contraseña no se modifica.
 */
export async function asegurarCuenta(
  supabase: SupabaseClient,
  existentes: Map<string, string>,
  correo: string,
  credencial: { contrasena: string } | { hashBcrypt: string },
): Promise<{ authId: string; creada: boolean }> {
  const clave = correo.toLowerCase();
  const existente = existentes.get(clave);
  if (existente) return { authId: existente, creada: false };

  const { data, error } = await supabase.auth.admin.createUser({
    email: clave,
    email_confirm: true,
    ...('contrasena' in credencial ? { password: credencial.contrasena } : { password_hash: credencial.hashBcrypt }),
  });
  if (error || !data.user) throw error ?? new Error(`No se pudo crear la cuenta de ${correo}.`);
  existentes.set(clave, data.user.id);
  return { authId: data.user.id, creada: true };
}
