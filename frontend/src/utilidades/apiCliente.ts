const URL_API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ErrorApi extends Error {
  mensajes: string[];
  estado: number;
  /** Código de negocio opcional que envía el backend (p. ej. CORREO_NO_VERIFICADO). */
  codigo?: string;

  constructor(mensajes: string[], estado: number, codigo?: string) {
    super(mensajes[0] ?? 'Ocurrió un error inesperado.');
    this.mensajes = mensajes;
    this.estado = estado;
    this.codigo = codigo;
  }
}

// Las rutas de autenticación nunca disparan la renovación automática de la sesión.
const RUTAS_SIN_RENOVACION = /^\/auth\/(login|registro|refrescar|logout|verificar-correo|reenviar-verificacion|recuperar-contrasena|restablecer-contrasena)$/;

let renovacionEnCurso: Promise<boolean> | null = null;

/**
 * El token de acceso de Supabase dura poco. Al recibir un 401 se renueva una sola vez con el refresh
 * token (cookie HttpOnly) y se repite la petición; las peticiones simultáneas comparten la renovación.
 */
function renovarSesion(): Promise<boolean> {
  renovacionEnCurso ??= fetch(`${URL_API}/auth/refrescar`, { method: 'POST', credentials: 'include' })
    .then((respuesta) => respuesta.ok)
    .catch(() => false)
    .finally(() => {
      renovacionEnCurso = null;
    });
  return renovacionEnCurso;
}

async function peticion<T>(ruta: string, opciones: RequestInit = {}, reintento = false): Promise<T> {
  const respuesta = await fetch(`${URL_API}${ruta}`, {
    ...opciones,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...opciones.headers,
    },
  });

  if (respuesta.status === 401 && !reintento && !RUTAS_SIN_RENOVACION.test(ruta) && (await renovarSesion())) {
    return peticion<T>(ruta, opciones, true);
  }

  const esJson = respuesta.headers.get('content-type')?.includes('application/json');
  const cuerpo = esJson ? await respuesta.json() : null;

  if (!respuesta.ok) {
    const mensaje = cuerpo?.message;
    const mensajes = Array.isArray(mensaje) ? mensaje : [mensaje ?? 'Ocurrió un error inesperado.'];
    throw new ErrorApi(mensajes, respuesta.status, cuerpo?.codigo);
  }

  return cuerpo as T;
}

export const api = {
  get: <T>(ruta: string) => peticion<T>(ruta, { method: 'GET' }),
  post: <T>(ruta: string, datos?: unknown) =>
    peticion<T>(ruta, { method: 'POST', body: datos ? JSON.stringify(datos) : undefined }),
  patch: <T>(ruta: string, datos?: unknown) =>
    peticion<T>(ruta, { method: 'PATCH', body: datos ? JSON.stringify(datos) : undefined }),
  delete: <T>(ruta: string) => peticion<T>(ruta, { method: 'DELETE' }),
};
