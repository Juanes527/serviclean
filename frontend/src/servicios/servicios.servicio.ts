import { api } from '@/utilidades/apiCliente';
import { Servicio } from '@/tipos';

export interface DatosServicio {
  nombre: string;
  descripcion: string;
  precioBase: number;
  duracionMinutos: number;
  icono?: string;
  activo?: boolean;
}

export const serviciosServicio = {
  listar: (todos = false) => api.get<Servicio[]>(`/servicios${todos ? '?todos=true' : ''}`),
  obtenerPorId: (id: string) => api.get<Servicio>(`/servicios/${id}`),
  crear: (datos: DatosServicio) => api.post<Servicio>('/servicios', datos),
  actualizar: (id: string, datos: Partial<DatosServicio>) => api.patch<Servicio>(`/servicios/${id}`, datos),
  eliminar: (id: string) => api.delete<{ mensaje: string }>(`/servicios/${id}`),
};
