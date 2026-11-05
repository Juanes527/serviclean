import { api } from '@/utilidades/apiCliente';
import { consulta } from '@/utilidades/consulta';
import { EstadoPago, MarcaTarjeta, MetodoPago, Pago } from '@/tipos';

/**
 * Datos que viajan al backend al pagar. Con tarjeta SIMULADA solo se envían los últimos 4 dígitos
 * y la marca: el número completo, el vencimiento y el CVV nunca salen del navegador.
 */
export type DatosPago =
  | { solicitudId: string; metodo: 'EFECTIVO' }
  | { solicitudId: string; metodo: 'SIMULADO_TARJETA'; tarjetaUltimos4: string; tarjetaMarca: MarcaTarjeta };

export interface FiltrosPagos {
  metodo?: MetodoPago;
  estado?: EstadoPago;
  desde?: string;
  hasta?: string;
  personalId?: string;
  solicitudId?: string;
}

export const pagosServicio = {
  registrar: (datos: DatosPago) => api.post<Pago>('/pagos', datos),
  misPagos: () => api.get<Pago[]>('/pagos/mios'),
  /** Personal de aseo: confirma que recibió el efectivo del cliente. */
  confirmarEfectivoRecibido: (solicitudId: string) => api.patch<Pago>(`/pagos/solicitud/${solicitudId}/efectivo-recibido`),
  listarTodos: (filtros: FiltrosPagos = {}) => api.get<Pago[]>(`/pagos${consulta({ ...filtros })}`),
  /** Verificación de pagos históricos pendientes (Nequi / transferencia). */
  actualizarEstado: (id: string, estado: 'PAGADO' | 'CANCELADO') => api.patch<Pago>(`/pagos/${id}/estado`, { estado }),
};
