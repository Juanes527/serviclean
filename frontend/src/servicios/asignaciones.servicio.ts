import { api } from '@/utilidades/apiCliente';
import { Asignacion, Solicitud } from '@/tipos';

export interface AsignacionConSolicitud extends Asignacion {
  solicitud: Solicitud;
}

export const asignacionesServicio = {
  misAsignaciones: () => api.get<AsignacionConSolicitud[]>('/asignaciones/mias'),
  listarTodas: () => api.get<AsignacionConSolicitud[]>('/asignaciones'),
  aceptar: (id: string) => api.patch<{ mensaje: string }>(`/asignaciones/${id}/aceptar`),
  reasignar: (id: string, personalId: string) =>
    api.patch<Asignacion>(`/asignaciones/${id}/reasignar`, { personalId }),
};
