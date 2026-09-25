import { EstadoLiquidacion, EstadoPago, EstadoSolicitud, EstadoUsuario, TipoMovimientoWallet } from '@/tipos';
import {
  CLASES_TONO,
  ConfiguracionEstado,
  ESTADOS_LIQUIDACION,
  ESTADOS_PAGO,
  ESTADOS_SOLICITUD,
  ESTADOS_USUARIO,
  TIPOS_MOVIMIENTO,
  Tono,
} from '@/utilidades/estados';

type PropiedadesEstadoBadge =
  | { tipo?: 'solicitud'; estado: EstadoSolicitud | string }
  | { tipo: 'pago'; estado: EstadoPago | string }
  | { tipo: 'usuario'; estado: EstadoUsuario | string }
  | { tipo: 'liquidacion'; estado: EstadoLiquidacion | string }
  | { tipo: 'movimiento'; estado: TipoMovimientoWallet | string };

const CONFIGURACIONES: Record<'solicitud' | 'pago' | 'usuario' | 'liquidacion' | 'movimiento', Record<string, ConfiguracionEstado>> = {
  solicitud: ESTADOS_SOLICITUD,
  pago: ESTADOS_PAGO,
  usuario: ESTADOS_USUARIO,
  liquidacion: ESTADOS_LIQUIDACION,
  movimiento: TIPOS_MOVIMIENTO,
};

/** Insignia de estado: punto + texto, con un único tono semántico por estado en toda la aplicación. */
export default function EstadoBadge({ estado, tipo = 'solicitud' }: PropiedadesEstadoBadge) {
  const configuracion = CONFIGURACIONES[tipo][estado] ?? { texto: estado, tono: 'neutro' as Tono };
  return <Insignia tono={configuracion.tono}>{configuracion.texto}</Insignia>;
}

export function Insignia({ tono = 'neutro', children, conPunto = true }: { tono?: Tono; children: React.ReactNode; conPunto?: boolean }) {
  const clases = CLASES_TONO[tono];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${clases.badge}`}
    >
      {conPunto && <span className={`h-1.5 w-1.5 rounded-full ${clases.punto}`} aria-hidden />}
      {children}
    </span>
  );
}
