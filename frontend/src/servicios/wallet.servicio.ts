import { api } from '@/utilidades/apiCliente';
import { consulta } from '@/utilidades/consulta';
import { MovimientoWallet, ResumenWallet, TipoMovimientoWallet } from '@/tipos';

export interface FiltrosMovimientos {
  tipo?: TipoMovimientoWallet;
  desde?: string;
  hasta?: string;
  personalId?: string;
  solicitudId?: string;
}

export interface DatosAjuste {
  tipo: 'AJUSTE' | 'BONIFICACION' | 'DESCUENTO';
  monto: number;
  concepto: string;
  claveIdempotencia: string;
}

export const walletServicio = {
  miWallet: () => api.get<ResumenWallet>('/wallet/mia'),
  misMovimientos: (filtros: FiltrosMovimientos = {}) => api.get<MovimientoWallet[]>(`/wallet/mia/movimientos${consulta({ ...filtros })}`),
  listar: () => api.get<ResumenWallet[]>('/wallet'),
  movimientos: (filtros: FiltrosMovimientos = {}) => api.get<MovimientoWallet[]>(`/wallet/movimientos${consulta({ ...filtros })}`),
  dePersonal: (personalId: string) => api.get<ResumenWallet>(`/wallet/personal/${personalId}`),
  movimientosDePersonal: (personalId: string, filtros: FiltrosMovimientos = {}) =>
    api.get<MovimientoWallet[]>(`/wallet/personal/${personalId}/movimientos${consulta({ ...filtros })}`),
  crearAjuste: (personalId: string, datos: DatosAjuste) => api.post<MovimientoWallet>(`/wallet/personal/${personalId}/ajustes`, datos),
};
