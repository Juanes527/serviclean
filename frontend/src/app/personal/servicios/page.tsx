'use client';

import { useMemo, useState } from 'react';
import { ClipboardCheck, Clock, MapPin, MessageSquareText, Phone, UserRound } from 'lucide-react';
import AccionAsignacion from '@/components/AccionAsignacion';
import EncabezadoPagina from '@/components/EncabezadoPagina';
import { EsqueletoLista } from '@/components/Esqueleto';
import EstadoBadge from '@/components/EstadoBadge';
import EstadoVacio, { EstadoError } from '@/components/EstadoVacio';
import { FiltroSegmentado } from '@/components/Filtros';
import IconoServicio from '@/components/IconoServicio';
import SeguimientoSolicitud from '@/components/SeguimientoSolicitud';
import Tarjeta from '@/components/Tarjeta';
import { AsignacionConSolicitud, asignacionesServicio } from '@/servicios/asignaciones.servicio';
import { EstadoSolicitud } from '@/tipos';
import { ESTADOS_CERRADOS } from '@/utilidades/estados';
import { etiquetaDia, formatearDuracion, formatearHora, formatearPrecio, marcaServicio, nombreCompleto } from '@/utilidades/formato';
import { useCarga } from '@/utilidades/useCarga';

type Filtro = 'TODOS' | Extract<EstadoSolicitud, 'ASIGNADO' | 'ACEPTADO' | 'EN_PROCESO'>;

export default function ServiciosAsignadosPersonal() {
  const { datos, cargando, error, recargar } = useCarga(() => asignacionesServicio.misAsignaciones());
  const [filtro, setFiltro] = useState<Filtro>('TODOS');

  const activas = useMemo(
    () =>
      (datos ?? [])
        .filter((a) => !ESTADOS_CERRADOS.includes(a.solicitud.estado))
        .sort((a, b) => marcaServicio(a.solicitud.fecha, a.solicitud.hora) - marcaServicio(b.solicitud.fecha, b.solicitud.hora)),
    [datos],
  );
  const visibles = filtro === 'TODOS' ? activas : activas.filter((a) => a.solicitud.estado === filtro);
  const contar = (estado: EstadoSolicitud) => activas.filter((a) => a.solicitud.estado === estado).length;

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Servicios asignados"
        descripcion="Acepta los servicios nuevos, inícialos al llegar y finalízalos al terminar."
      />

      {cargando ? (
        <EsqueletoLista filas={4} />
      ) : error ? (
        <EstadoError mensaje={error} onReintentar={() => recargar()} />
      ) : activas.length === 0 ? (
        <EstadoVacio
          icono={ClipboardCheck}
          titulo="No tienes servicios asignados"
          descripcion="Mantén tu disponibilidad actualizada para recibir nuevas asignaciones."
        />
      ) : (
        <>
          <FiltroSegmentado
            etiqueta="Filtrar por estado"
            valor={filtro}
            onCambiar={setFiltro}
            opciones={[
              { valor: 'TODOS', texto: 'Todos', total: activas.length },
              { valor: 'ASIGNADO', texto: 'Por aceptar', total: contar('ASIGNADO') },
              { valor: 'ACEPTADO', texto: 'Aceptados', total: contar('ACEPTADO') },
              { valor: 'EN_PROCESO', texto: 'En proceso', total: contar('EN_PROCESO') },
            ]}
          />
          {visibles.length === 0 ? (
            <EstadoVacio icono={ClipboardCheck} titulo="Nada por aquí" descripcion="No tienes servicios en este estado." />
          ) : (
            <ul className="flex flex-col gap-4">
              {visibles.map((asignacion) => (
                <li key={asignacion.id}>
                  <TarjetaServicio asignacion={asignacion} onActualizado={() => recargar(true)} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function TarjetaServicio({ asignacion, onActualizado }: { asignacion: AsignacionConSolicitud; onActualizado: () => void }) {
  const { solicitud } = asignacion;
  return (
    <Tarjeta relleno="ninguno" className={solicitud.estado === 'ASIGNADO' ? 'ring-1 ring-amber-200' : ''}>
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <IconoServicio icono={solicitud.servicio.icono} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-slate-900">{solicitud.servicio.nombre}</h2>
              <EstadoBadge estado={solicitud.estado} />
            </div>
            <p className="mt-1 text-sm font-medium text-marca-700">
              {etiquetaDia(solicitud.fecha)} · {formatearHora(solicitud.hora)}
            </p>
          </div>
        </div>
        <p className="font-display text-lg font-bold text-slate-900 cifras sm:text-right">{formatearPrecio(solicitud.servicio.precioBase)}</p>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 border-t border-slate-100 px-5 py-4 text-sm sm:grid-cols-2 sm:px-6">
        <div className="flex items-start gap-2.5">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <div className="min-w-0">
            <dt className="sr-only">Dirección</dt>
            <dd className="text-slate-700 texto-largo">{solicitud.direccion}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <div>
            <dt className="sr-only">Cliente</dt>
            <dd className="text-slate-700">{nombreCompleto(solicitud.cliente) || 'Cliente'}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <div>
            <dt className="sr-only">Teléfono</dt>
            <dd>
              <a href={`tel:${solicitud.telefono.replace(/\s/g, '')}`} className="font-medium text-marca-700 hover:underline">
                {solicitud.telefono}
              </a>
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <div>
            <dt className="sr-only">Duración estimada</dt>
            <dd className="text-slate-700">{formatearDuracion(solicitud.servicio.duracionMinutos)} estimadas</dd>
          </div>
        </div>
        {solicitud.observaciones && (
          <div className="flex items-start gap-2.5 sm:col-span-2">
            <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <div>
              <dt className="sr-only">Observaciones del cliente</dt>
              <dd className="rounded-lg bg-slate-50 px-3 py-2 text-slate-600">{solicitud.observaciones}</dd>
            </div>
          </div>
        )}
      </dl>

      <div className="flex flex-col gap-4 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="sm:w-80">
          <SeguimientoSolicitud estado={solicitud.estado} compacto />
        </div>
        <AccionAsignacion asignacion={asignacion} onActualizado={onActualizado} tamano="md" />
      </div>
    </Tarjeta>
  );
}
