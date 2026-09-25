import { api } from '@/utilidades/apiCliente';
import { EstadoSolicitud, MetodoPagoVigente, Solicitud } from '@/tipos';

export interface DatosSolicitud {
  servicioId: string;
  fecha: string;
  hora: string;
  direccion: string;
  telefono: string;
  observaciones?: string;
  metodoPago: MetodoPagoVigente;
}

export const solicitudesServicio = {
  crear: (datos: DatosSolicitud) => api.post<Solicitud>('/solicitudes', datos),
  misSolicitudes: () => api.get<Solicitud[]>('/solicitudes/mias'),
  listarTodas: (estado?: EstadoSolicitud) =>
    api.get<Solicitud[]>(`/solicitudes${estado ? `?estado=${estado}` : ''}`),
  obtenerPorId: (id: string) => api.get<Solicitud>(`/solicitudes/${id}`),
  cancelar: (id: string) => api.patch<{ mensaje: string }>(`/solicitudes/${id}/cancelar`),
  actualizarEstado: (id: string, estado: string, observaciones?: string) =>
    api.patch<{ mensaje: string }>(`/solicitudes/${id}/estado`, { estado, observaciones }),
};
