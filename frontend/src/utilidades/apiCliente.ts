const URL_API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ErrorApi extends Error {
  mensajes: string[];

  constructor(mensajes: string[]) {
    super(mensajes[0] ?? 'Ocurrió un error inesperado.');
    this.mensajes = mensajes;
  }
}

async function peticion<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const respuesta = await fetch(`${URL_API}${ruta}`, {
    ...opciones,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...opciones.headers,
    },
  });

  const esJson = respuesta.headers.get('content-type')?.includes('application/json');
  const cuerpo = esJson ? await respuesta.json() : null;

  if (!respuesta.ok) {
    const mensaje = cuerpo?.message;
    const mensajes = Array.isArray(mensaje) ? mensaje : [mensaje ?? 'Ocurrió un error inesperado.'];
    throw new ErrorApi(mensajes);
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
