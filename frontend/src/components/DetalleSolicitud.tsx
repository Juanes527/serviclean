import { ReactNode } from 'react';
import { CalendarDays, Clock, CreditCard, MapPin, MessageSquareText, Phone, UserRound } from 'lucide-react';
import { Solicitud } from '@/tipos';
import { TEXTO_METODO_PAGO } from '@/utilidades/estados';
import { formatearFecha, formatearFechaHora, formatearHora, formatearPrecio, nombreCompleto } from '@/utilidades/formato';
import Avatar from './Avatar';
import EstadoBadge from './EstadoBadge';
import { Estrellas } from './Estrellas';
import IconoServicio from './IconoServicio';
import Modal from './Modal';
import SeguimientoSolicitud from './SeguimientoSolicitud';

function Dato({ icono, etiqueta, children }: { icono: ReactNode; etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-slate-400 [&>svg]:h-4 [&>svg]:w-4">{icono}</span>
      <div className="min-w-0">
        <dt className="text-xs text-slate-500">{etiqueta}</dt>
        <dd className="mt-0.5 text-sm font-medium text-slate-800 texto-largo">{children}</dd>
      </div>
    </div>
  );
}

interface PropiedadesDetalleSolicitud {
  solicitud: Solicitud | null;
  onCerrar: () => void;
  /** Acciones disponibles según el rol (cancelar, pagar, calificar…). */
  acciones?: ReactNode;
  mostrarCliente?: boolean;
}

/** Vista de detalle de una solicitud en un diálogo. */
export default function DetalleSolicitud({ solicitud, onCerrar, acciones, mostrarCliente = false }: PropiedadesDetalleSolicitud) {
  return (
    <Modal abierto={!!solicitud} titulo="Detalle de la solicitud" onCerrar={onCerrar} tamano="lg" pie={acciones}>
      {solicitud && (
        <div className="flex flex-col gap-6 pb-2">
          <div className="flex items-center gap-4">
            <IconoServicio icono={solicitud.servicio.icono} tamano="lg" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-bold text-slate-900">{solicitud.servicio.nombre}</p>
              <p className="text-sm text-slate-500">
                Creada el {formatearFechaHora(solicitud.fechaCreacion)}
              </p>
            </div>
            <EstadoBadge estado={solicitud.estado} />
          </div>

          <SeguimientoSolicitud estado={solicitud.estado} />

          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 rounded-2xl bg-slate-50/80 p-4 sm:grid-cols-2 sm:p-5">
            <Dato icono={<CalendarDays />} etiqueta="Fecha">
              <span className="capitalize-first inline-block">{formatearFecha(solicitud.fecha)}</span>
            </Dato>
            <Dato icono={<Clock />} etiqueta="Hora">
              {formatearHora(solicitud.hora)}
            </Dato>
            <Dato icono={<MapPin />} etiqueta="Dirección">
              {solicitud.direccion}
            </Dato>
            <Dato icono={<Phone />} etiqueta="Teléfono de contacto">
              {solicitud.telefono}
            </Dato>
            <Dato icono={<CreditCard />} etiqueta="Método de pago">
              {TEXTO_METODO_PAGO[solicitud.metodoPago]}
            </Dato>
            {mostrarCliente && solicitud.cliente && (
              <Dato icono={<UserRound />} etiqueta="Cliente">
                {nombreCompleto(solicitud.cliente)}
              </Dato>
            )}
            {solicitud.observaciones && (
              <div className="sm:col-span-2">
                <Dato icono={<MessageSquareText />} etiqueta="Observaciones">
                  <span className="font-normal text-slate-600">{solicitud.observaciones}</span>
                </Dato>
              </div>
            )}
          </dl>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/80 p-4">
              <p className="text-xs font-medium text-slate-500">Personal asignado</p>
              {solicitud.asignacion?.personal ? (
                <div className="mt-2.5 flex items-center gap-3">
                  <Avatar usuario={solicitud.asignacion.personal} tamano="sm" />
                  <p className="text-sm font-semibold text-slate-800">{nombreCompleto(solicitud.asignacion.personal)}</p>
                </div>
              ) : (
                <p className="mt-2.5 text-sm text-slate-500">Aún sin asignar. Te avisaremos cuando se asigne.</p>
              )}
            </div>
            <div className="rounded-2xl border border-slate-200/80 p-4">
              <p className="text-xs font-medium text-slate-500">Pago</p>
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <p className="font-display text-lg font-bold text-slate-900 cifras">
                  {formatearPrecio(solicitud.pago?.monto ?? solicitud.servicio.precioBase)}
                </p>
                {solicitud.pago ? (
                  <EstadoBadge tipo="pago" estado={solicitud.pago.estado} />
                ) : (
                  <span className="text-xs font-medium text-slate-500">Sin registrar</span>
                )}
              </div>
              {solicitud.pago && (
                <p className="mt-1.5 text-xs text-slate-500">
                  {TEXTO_METODO_PAGO[solicitud.pago.metodo]}
                  {solicitud.pago.tarjetaUltimos4 ? ` •••• ${solicitud.pago.tarjetaUltimos4}` : ''} ·{' '}
                  <span className="font-mono">{solicitud.pago.referencia}</span>
                </p>
              )}
            </div>
          </div>

          {solicitud.calificacion && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500">Calificación</p>
                <Estrellas valor={solicitud.calificacion.puntuacion} />
              </div>
              {solicitud.calificacion.comentario && (
                <p className="mt-2 text-sm italic leading-relaxed text-slate-600">“{solicitud.calificacion.comentario}”</p>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
