import { api } from '@/utilidades/apiCliente';
import { consulta } from '@/utilidades/consulta';
import { EstadoLiquidacion, Liquidacion, VistaPreviaLiquidacion } from '@/tipos';

export interface FiltrosLiquidaciones {
  estado?: EstadoLiquidacion;
  personalId?: string;
  desde?: string;
  hasta?: string;
}

export const liquidacionesServicio = {
  mias: () => api.get<Liquidacion[]>('/liquidaciones/mias'),
  listar: (filtros: FiltrosLiquidaciones = {}) => api.get<Liquidacion[]>(`/liquidaciones${consulta({ ...filtros })}`),
  obtener: (id: string) => api.get<Liquidacion>(`/liquidaciones/${id}`),
  vistaPrevia: (personalId: string) => api.get<VistaPreviaLiquidacion>(`/liquidaciones/vista-previa/${personalId}`),
  crear: (personalId: string, observaciones?: string) => api.post<Liquidacion>('/liquidaciones', { personalId, observaciones }),
  generarPeriodo: () =>
    api.post<{ creadas: Liquidacion[]; omitidas: { personalId: string; nombre: string; motivo: string }[] }>('/liquidaciones/generar-periodo'),
  pagar: (id: string) => api.patch<Liquidacion>(`/liquidaciones/${id}/pagar`),
  cancelar: (id: string) => api.patch<Liquidacion>(`/liquidaciones/${id}/cancelar`),
};
