'use client';

import Link from 'next/link';
import { ArrowRight, Bell, CalendarDays, CircleCheck, ClipboardList, Clock, MapPin, Plus, Sparkles, Star } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { clasesBoton } from '@/components/Boton';
import EncabezadoPagina from '@/components/EncabezadoPagina';
import { EsqueletoLista, EsqueletoMetricas, Esqueleto } from '@/components/Esqueleto';
import EstadoBadge from '@/components/EstadoBadge';
import EstadoVacio, { EstadoError } from '@/components/EstadoVacio';
import IconoServicio from '@/components/IconoServicio';
import Metrica from '@/components/Metrica';
import SeguimientoSolicitud from '@/components/SeguimientoSolicitud';
import Tarjeta, { EncabezadoTarjeta } from '@/components/Tarjeta';
import { notificacionesServicio } from '@/servicios/notificaciones.servicio';
import { serviciosServicio } from '@/servicios/servicios.servicio';
import { solicitudesServicio } from '@/servicios/solicitudes.servicio';
import { Notificacion } from '@/tipos';
import { useAutenticacion } from '@/utilidades/contextoAutenticacion';
import { ESTADOS_CERRADOS } from '@/utilidades/estados';
import {
  claveFecha,
  etiquetaDia,
  fechaISOLocal,
  formatearDuracion,
  formatearFechaMedia,
  formatearHora,
  formatearPrecio,
  formatearRelativo,
  marcaServicio,
  nombreCompleto,
} from '@/utilidades/formato';
import { useCarga } from '@/utilidades/useCarga';

function saludo() {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function InicioCliente() {
  const { usuario } = useAutenticacion();
  const { datos, cargando, error, recargar } = useCarga(() =>
    Promise.all([
      serviciosServicio.listar(),
      solicitudesServicio.misSolicitudes(),
      notificacionesServicio.listarMias().catch((): Notificacion[] => []),
    ]),
  );

  const encabezado = (
    <EncabezadoPagina
      titulo={`${saludo()}, ${usuario?.nombre ?? ''}`}
      descripcion="Este es el resumen de tus servicios de limpieza."
      acciones={
        <Link href="/cliente/servicios" className={clasesBoton('primario', 'md', 'w-full sm:w-auto lg:hidden')}>
          <Plus className="h-4 w-4" aria-hidden />
          Solicitar servicio
        </Link>
      }
    />
  );

  if (cargando) {
    return (
      <div className="flex flex-col gap-8" role="status" aria-label="Cargando resumen">
        {encabezado}
        <EsqueletoMetricas />
        <div className="grid gap-6 lg:grid-cols-3">
          <Esqueleto className="h-64 rounded-2xl lg:col-span-2" />
          <Esqueleto className="h-64 rounded-2xl" />
        </div>
        <EsqueletoLista filas={3} />
      </div>
    );
  }

  if (error || !datos) {
    return (
      <div className="flex flex-col gap-8">
        {encabezado}
        <EstadoError mensaje={error} onReintentar={() => recargar()} />
      </div>
    );
  }

  const [servicios, solicitudes, notificaciones] = datos;
  const hoy = fechaISOLocal();
  const abiertas = solicitudes
    .filter((solicitud) => !ESTADOS_CERRADOS.includes(solicitud.estado))
    .sort((a, b) => marcaServicio(a.fecha, a.hora) - marcaServicio(b.fecha, b.hora));
  const proxima = abiertas.find((solicitud) => claveFecha(solicitud.fecha) >= hoy) ?? abiertas[0];
  const finalizadas = solicitudes.filter((solicitud) => solicitud.estado === 'FINALIZADO');
  const porCalificar = finalizadas.filter((solicitud) => !solicitud.calificacion);
  const recientes = [...solicitudes]
    .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime())
    .slice(0, 5);
  const notificacionesRecientes = notificaciones.slice(0, 4);

  return (
    <div className="flex flex-col gap-8">
      {encabezado}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Metrica
          etiqueta="Servicios en curso"
          valor={abiertas.length}
          icono={ClipboardList}
          tono="marca"
          href="/cliente/mis-servicios"
          contexto={abiertas.length > 0 ? 'Pendientes, asignados o en proceso' : 'No tienes servicios en curso'}
        />
        <Metrica
          etiqueta="Servicios finalizados"
          valor={finalizadas.length}
          icono={CircleCheck}
          tono="exito"
          href="/cliente/historial"
          contexto={`${solicitudes.length} solicitudes en total`}
        />
        <Metrica
          etiqueta="Por calificar"
          valor={porCalificar.length}
          icono={Star}
          tono="advertencia"
          href="/cliente/historial"
          contexto={porCalificar.length > 0 ? 'Cuéntanos cómo te fue' : 'Estás al día con tus calificaciones'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Próximo servicio */}
        <section className="lg:col-span-2" aria-labelledby="titulo-proximo">
          {proxima ? (
            <Tarjeta relleno="ninguno" className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-marca-50/80 to-fresco-50/50 px-5 py-3.5 sm:px-6">
                <h2 id="titulo-proximo" className="flex items-center gap-2 text-sm font-semibold text-marca-800">
                  <CalendarDays className="h-4 w-4" aria-hidden />
                  Tu próximo servicio · {etiquetaDia(proxima.fecha)}
                </h2>
                <EstadoBadge estado={proxima.estado} />
              </div>
              <div className="p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <IconoServicio icono={proxima.servicio.icono} tamano="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-xl font-bold text-slate-900">{proxima.servicio.nombre}</p>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-slate-400" aria-hidden />
                        {formatearFechaMedia(proxima.fecha)} · {formatearHora(proxima.hora)}
                      </span>
                      <span className="flex min-w-0 items-center gap-1.5">
                        <MapPin className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                        <span className="truncate">{proxima.direccion}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <SeguimientoSolicitud estado={proxima.estado} />
                </div>

                <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  {proxima.asignacion?.personal ? (
                    <div className="flex items-center gap-3">
                      <Avatar usuario={proxima.asignacion.personal} />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{nombreCompleto(proxima.asignacion.personal)}</p>
                        <p className="text-xs text-slate-500">Personal asignado</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Estamos asignando a una persona para tu servicio.</p>
                  )}
                  <Link href="/cliente/mis-servicios" className={clasesBoton('contorno', 'sm')}>
                    Ver detalles
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </div>
            </Tarjeta>
          ) : (
            <Tarjeta className="flex h-full flex-col">
              <h2 id="titulo-proximo" className="text-base font-semibold text-slate-900">
                Tu próximo servicio
              </h2>
              <EstadoVacio
                compacto
                icono={CalendarDays}
                titulo="No tienes servicios programados"
                descripcion="Agenda una limpieza y aquí verás la fecha, la hora y quién te atenderá."
                accion={
                  <Link href="/cliente/servicios" className={clasesBoton('primario', 'sm')}>
                    <Plus className="h-4 w-4" aria-hidden />
                    Agendar ahora
                  </Link>
                }
                className="flex-1"
              />
            </Tarjeta>
          )}
        </section>

        {/* Notificaciones */}
        <Tarjeta relleno="ninguno" className="flex flex-col">
          <EncabezadoTarjeta
            className="px-5 pt-5"
            titulo="Notificaciones"
            accion={
              <Link href="/cliente/notificaciones" className="text-sm font-medium text-marca-700 hover:underline">
                Ver todas
              </Link>
            }
          />
          {notificacionesRecientes.length === 0 ? (
            <EstadoVacio compacto icono={Bell} titulo="Todo al día" descripcion="Aquí verás los cambios de estado de tus servicios." />
          ) : (
            <ul className="mt-3 flex-1 divide-y divide-slate-100 pb-2">
              {notificacionesRecientes.map((notificacion) => (
                <li key={notificacion.id} className="flex gap-3 px-5 py-3">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notificacion.leida ? 'bg-slate-200' : 'bg-marca-500'}`}
                    aria-label={notificacion.leida ? 'Leída' : 'No leída'}
                  />
                  <div className="min-w-0">
                    <p className={`text-sm leading-snug ${notificacion.leida ? 'text-slate-500' : 'font-medium text-slate-800'}`}>
                      {notificacion.mensaje}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{formatearRelativo(notificacion.fechaCreacion)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      {/* Actividad reciente */}
      <section aria-labelledby="titulo-recientes">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="titulo-recientes" className="text-lg font-semibold text-slate-900">
            Actividad reciente
          </h2>
          {recientes.length > 0 && (
            <Link href="/cliente/mis-servicios" className="text-sm font-medium text-marca-700 hover:underline">
              Ver mis servicios
            </Link>
          )}
        </div>
        {recientes.length === 0 ? (
          <EstadoVacio
            icono={ClipboardList}
            titulo="Aún no has solicitado servicios"
            descripcion="Cuando solicites tu primer servicio, aquí podrás seguir su estado."
          />
        ) : (
          <Tarjeta relleno="ninguno">
            <ul className="divide-y divide-slate-100">
              {recientes.map((solicitud) => (
                <li key={solicitud.id}>
                  <Link
                    href={ESTADOS_CERRADOS.includes(solicitud.estado) ? '/cliente/historial' : '/cliente/mis-servicios'}
                    className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-slate-50/80 sm:px-5"
                  >
                    <IconoServicio icono={solicitud.servicio.icono} tamano="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{solicitud.servicio.nombre}</p>
                      <p className="text-[13px] text-slate-500">
                        {formatearFechaMedia(solicitud.fecha)} · {formatearHora(solicitud.hora)}
                      </p>
                    </div>
                    <span className="hidden text-sm font-medium text-slate-700 cifras sm:block">
                      {formatearPrecio(solicitud.servicio.precioBase)}
                    </span>
                    <EstadoBadge estado={solicitud.estado} />
                  </Link>
                </li>
              ))}
            </ul>
          </Tarjeta>
        )}
      </section>

      {/* Servicios sugeridos */}
      {servicios.length > 0 && (
        <section aria-labelledby="titulo-servicios">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="titulo-servicios" className="text-lg font-semibold text-slate-900">
              Servicios disponibles
            </h2>
            <Link href="/cliente/servicios" className="text-sm font-medium text-marca-700 hover:underline">
              Ver catálogo
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {servicios.slice(0, 4).map((servicio) => (
              <Link
                key={servicio.id}
                href={`/cliente/servicios/${servicio.id}`}
                className="group flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-suave transition-[border-color,box-shadow] duration-200 hover:border-marca-200 hover:shadow-elevada"
              >
                <IconoServicio icono={servicio.icono} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{servicio.nombre}</p>
                  <p className="text-[13px] text-slate-500 cifras">
                    {formatearPrecio(servicio.precioBase)} · {formatearDuracion(servicio.duracionMinutos)}
                  </p>
                </div>
                <Sparkles className="h-4 w-4 text-slate-300 transition-colors group-hover:text-fresco-500" aria-hidden />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
