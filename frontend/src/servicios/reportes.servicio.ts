import { api } from '@/utilidades/apiCliente';
import { consulta } from '@/utilidades/consulta';
import {
  EstadoLiquidacion,
  EstadoPago,
  FinanzasPorPeriodo,
  FinanzasPorServicio,
  FlujoFinanciero,
  LiquidacionesPorPeriodo,
  MetodoPago,
  ResumenFinanciero,
  ResumenReportes,
  ResumenWallet,
} from '@/tipos';

export interface SolicitudesPorEstado {
  estado: string;
  total: number;
}

export interface FiltrosPeriodo {
  desde?: string;
  hasta?: string;
  agrupacion?: 'mes' | 'semana';
}

export interface FiltrosFlujo {
  desde?: string;
  hasta?: string;
  tipo?: 'INGRESO' | 'EGRESO';
  metodo?: MetodoPago;
  estado?: EstadoPago | EstadoLiquidacion;
  personalId?: string;
  solicitudId?: string;
}

export const reportesServicio = {
  resumen: () => api.get<ResumenReportes>('/reportes/resumen'),
  solicitudesPorEstado: () => api.get<SolicitudesPorEstado[]>('/reportes/solicitudes-por-estado'),
  resumenFinanciero: (filtros: FiltrosPeriodo = {}) => api.get<ResumenFinanciero>(`/reportes/finanzas/resumen${consulta({ ...filtros })}`),
  finanzasPorPeriodo: (filtros: FiltrosPeriodo = {}) => api.get<FinanzasPorPeriodo[]>(`/reportes/finanzas/periodos${consulta({ ...filtros })}`),
  finanzasPorServicio: (filtros: FiltrosPeriodo = {}) => api.get<FinanzasPorServicio[]>(`/reportes/finanzas/servicios${consulta({ ...filtros })}`),
  finanzasPersonal: () => api.get<ResumenWallet[]>('/reportes/finanzas/personal'),
  liquidacionesPorPeriodo: (filtros: FiltrosPeriodo = {}) =>
    api.get<LiquidacionesPorPeriodo[]>(`/reportes/finanzas/liquidaciones${consulta({ ...filtros })}`),
  flujo: (filtros: FiltrosFlujo = {}) => api.get<FlujoFinanciero>(`/reportes/finanzas/flujo${consulta({ ...filtros })}`),
};
