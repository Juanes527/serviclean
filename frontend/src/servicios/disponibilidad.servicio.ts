import { api } from '@/utilidades/apiCliente';
import { Disponibilidad } from '@/tipos';

export interface DatosDisponibilidad {
  fecha: string;
  horaInicio: string;
  horaFin: string;
}

export const disponibilidadServicio = {
  listarMia: () => api.get<Disponibilidad[]>('/disponibilidad/mia'),
  crear: (datos: DatosDisponibilidad) => api.post<Disponibilidad>('/disponibilidad', datos),
  eliminar: (id: string) => api.delete<{ mensaje: string }>(`/disponibilidad/${id}`),
};
