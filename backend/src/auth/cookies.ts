import type { CookieOptions, Response } from 'express';
import type { Session } from '@supabase/supabase-js';

/** Token de acceso de Supabase (JWT de corta duración). */
export const COOKIE_ACCESO = 'serviclean_token';
/** Refresh token de Supabase: permite renovar el token de acceso sin volver a pedir la contraseña. */
export const COOKIE_REFRESCO = 'serviclean_refresh';

const DURACION_SESION_MS = 1000 * 60 * 60 * 24 * 7;

const opcionesCookie = (): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
});

export function guardarSesion(respuesta: Response, sesion: Session) {
  // El JWT caduca antes que la cookie: al vencer, el frontend llama a /auth/refrescar.
  respuesta.cookie(COOKIE_ACCESO, sesion.access_token, { ...opcionesCookie(), maxAge: DURACION_SESION_MS });
  respuesta.cookie(COOKIE_REFRESCO, sesion.refresh_token, { ...opcionesCookie(), maxAge: DURACION_SESION_MS });
}

export function borrarSesion(respuesta: Response) {
  respuesta.clearCookie(COOKIE_ACCESO, opcionesCookie());
  respuesta.clearCookie(COOKIE_REFRESCO, opcionesCookie());
}
