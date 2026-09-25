import { api } from '@/utilidades/apiCliente';
import { Notificacion } from '@/tipos';

export const notificacionesServicio = {
  listarMias: () => api.get<Notificacion[]>('/notificaciones/mias'),
  contarNoLeidas: () => api.get<{ total: number }>('/notificaciones/no-leidas/contador'),
  marcarComoLeida: (id: string) => api.patch<{ mensaje: string }>(`/notificaciones/${id}/leer`),
  marcarTodasComoLeidas: () => api.patch<{ mensaje: string }>('/notificaciones/leer-todas'),
};
