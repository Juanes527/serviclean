import { api } from '@/utilidades/apiCliente';
import { Calificacion } from '@/tipos';

export interface PromedioPersonal {
  promedio: number;
  total: number;
  calificaciones: Calificacion[];
}

export const calificacionesServicio = {
  crear: (solicitudId: string, puntuacion: number, comentario?: string) =>
    api.post<Calificacion>('/calificaciones', { solicitudId, puntuacion, comentario }),
  miPromedio: () => api.get<PromedioPersonal>('/calificaciones/mi-promedio'),
};
