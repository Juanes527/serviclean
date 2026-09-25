import { ErrorApi } from './apiCliente';

/** Obtiene un mensaje legible a partir de un error de la API o usa el mensaje por defecto. */
export function mensajeError(excepcion: unknown, porDefecto: string): string {
  if (excepcion instanceof ErrorApi) return excepcion.mensajes.join(' ');
  if (excepcion instanceof TypeError) return 'No fue posible conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.';
  return porDefecto;
}
