import { api } from '@/utilidades/apiCliente';
import { Solicitud } from '@/tipos';
import { AsignacionConSolicitud } from './asignaciones.servicio';

export const agendaServicio = {
  agendaCliente: () => api.get<Solicitud[]>('/agenda/cliente'),
  agendaPersonal: () => api.get<AsignacionConSolicitud[]>('/agenda/personal'),
};
