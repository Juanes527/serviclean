'use client';

import Link from 'next/link';
import { ArrowRight, BellRing, CalendarClock, CalendarDays, CircleCheck, ClipboardCheck, Clock, MapPin, MessageSquareQuote, Star, UserRound, Wallet } from 'lucide-react';
import AccionAsignacion from '@/components/AccionAsignacion';
import BloqueFecha from '@/components/BloqueFecha';
import { clasesBoton } from '@/components/Boton';
import EncabezadoPagina from '@/components/EncabezadoPagina';
import { Esqueleto, EsqueletoMetricas } from '@/components/Esqueleto';
import EstadoBadge from '@/components/EstadoBadge';
import EstadoVacio, { EstadoError } from '@/components/EstadoVacio';
import { Estrellas } from '@/components/Estrellas';
import IconoServicio from '@/components/IconoServicio';
import Metrica from '@/components/Metrica';
import Tarjeta, { EncabezadoTarjeta } from '@/components/Tarjeta';
import { asignacionesServicio } from '@/servicios/asignaciones.servicio';
import { calificacionesServicio } from '@/servicios/calificaciones.servicio';
import { disponibilidadServicio } from '@/servicios/disponibilidad.servicio';
import { walletServicio } from '@/servicios/wallet.servicio';
import { Disponibilidad } from '@/tipos';
import { useAutenticacion } from '@/utilidades/contextoAutenticacion';
import { ESTADOS_ACTIVOS } from '@/utilidades/estados';
import {
  claveFecha,
  etiquetaDia,
  fechaISOLocal,
  formatearFechaMedia,
  formatearHora,
  formatearPrecio,
  formatearRelativo,
  marcaServicio,
  nombreCompleto,
} from '@/utilidades/formato';
import { useCarga } from '@/utilidades/useCarga';

export default function InicioPersonal() {
  const { usuario } = useAutenticacion();
  const { datos, cargando, error, recargar } = useCarga(() =>
    Promise.all([
      asignacionesServicio.misAsignaciones(),
      calificacionesServicio.miPromedio(),
      disponibilidadServicio.listarMia().catch((): Disponibilidad[] => []),
      walletServicio.miWallet().catch(() => null),
    ]),
  );

  const encabezado = (
    <EncabezadoPagina
      titulo={`Hola, ${usuario?.nombre ?? ''}`}
      descripcion="Revisa tus servicios asignados y mantén tu disponibilidad al día."
      acciones={
        <Link href="/personal/disponibilidad" className={clasesBoton('contorno', 'md', 'w-full sm:w-auto')}>
          <CalendarClock className="h-4 w-4" aria-hidden />
          Gestionar disponibilidad
        </Link>
      }
    />
  );

  if (cargando) {
    return (
      <div className="flex flex-col gap-8" role="status" aria-label="Cargando resumen">
        {encabezado}
        <EsqueletoMetricas cantidad={4} />
        <div className="grid gap-6 lg:grid-cols-3">
          <Esqueleto className="h-72 rounded-2xl lg:col-span-2" />
          <Esqueleto className="h-72 rounded-2xl" />
        </div>
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

  const [asignaciones, promedio, disponibilidad, wallet] = datos;
  const hoy = fechaISOLocal();
  const porAceptar = asignaciones.filter((a) => a.solicitud.estado === 'ASIGNADO');
  const activas = asignaciones
    .filter((a) => ESTADOS_ACTIVOS.includes(a.solicitud.estado))
    .sort((a, b) => marcaServicio(a.solicitud.fecha, a.solicitud.hora) - marcaServicio(b.solicitud.fecha, b.solicitud.hora));
  const proximas = activas.filter((a) => a.solicitud.estado !== 'ASIGNADO').slice(0, 4);
  const completadas = asignaciones.filter((a) => a.solicitud.estado === 'FINALIZADO');
  const franjasFuturas = disponibilidad
    .filter((franja) => claveFecha(franja.fecha) >= hoy)
    .sort((a, b) => marcaServicio(a.fecha, a.horaInicio) - marcaServicio(b.fecha, b.horaInicio));
  const franjasHoy = franjasFuturas.filter((franja) => claveFecha(franja.fecha) === hoy);
  const resenas = promedio.calificaciones
    .filter((calificacion) => calificacion.comentario)
    .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime())
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-8">
      {encabezado}

      {/* Estado de disponibilidad */}
      <div
        className={`flex flex-col gap-3 rounded-2xl border px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
          franjasHoy.length > 0 ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-white'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <span className="relative flex h-3 w-3 shrink-0" aria-hidden>
            {franjasHoy.length > 0 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
            <span className={`relative inline-flex h-3 w-3 rounded-full ${franjasHoy.length > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {franjasHoy.length > 0 ? 'Estás disponible hoy' : 'No tienes disponibilidad registrada para hoy'}
            </p>
            <p className="text-sm text-slate-500">
              {franjasHoy.length > 0
                ? franjasHoy.map((franja) => `${formatearHora(franja.horaInicio)} – ${formatearHora(franja.horaFin)}`).join(' · ')
                : franjasFuturas.length > 0
                  ? `Tu próxima franja: ${etiquetaDia(franjasFuturas[0].fecha).toLowerCase()}, ${formatearHora(franjasFuturas[0].horaInicio)}`
                  : 'Registra tus horarios para recibir nuevas asignaciones.'}
            </p>
          </div>
        </div>
        <Link href="/personal/disponibilidad" className={clasesBoton(franjasHoy.length > 0 ? 'contorno' : 'primario', 'sm')}>
          {franjasHoy.length > 0 ? 'Editar horarios' : 'Registrar disponibilidad'}
        </Link>
      </div>

      {/* Pendientes de aceptación */}
      {porAceptar.length > 0 && (
        <section aria-labelledby="titulo-por-aceptar" className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <BellRing className="h-5 w-5 text-amber-600" aria-hidden />
            <h2 id="titulo-por-aceptar" className="text-base font-semibold text-slate-900">
              {porAceptar.length === 1 ? 'Tienes 1 servicio por aceptar' : `Tienes ${porAceptar.length} servicios por aceptar`}
            </h2>
          </div>
          <ul className="flex flex-col gap-2.5">
            {porAceptar.map((asignacion) => (
              <li
                key={asignacion.id}
                className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-suave ring-1 ring-amber-100 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <IconoServicio icono={asignacion.solicitud.servicio.icono} tamano="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{asignacion.solicitud.servicio.nombre}</p>
                    <p className="truncate text-[13px] text-slate-500">
                      {formatearFechaMedia(asignacion.solicitud.fecha)} · {formatearHora(asignacion.solicitud.hora)} · {asignacion.solicitud.direccion}
                    </p>
                  </div>
                </div>
                <AccionAsignacion asignacion={asignacion} onActualizado={() => recargar(true)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {wallet && (
        <Link
          href="/personal/wallet"
          className={`group flex items-center gap-4 rounded-2xl border px-5 py-4 transition-colors ${
            wallet.saldo < 0 ? 'border-amber-200 bg-amber-50/60 hover:bg-amber-50' : 'border-marca-100 bg-marca-50/50 hover:bg-marca-50'
          }`}
        >
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              wallet.saldo < 0 ? 'bg-amber-100 text-amber-700' : 'bg-marca-100 text-marca-700'
            }`}
          >
            <Wallet className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-600">{wallet.saldo < 0 ? 'Saldo pendiente con ServiClean' : 'Saldo disponible en tu wallet'}</p>
            <p className={`font-display text-xl font-bold cifras ${wallet.saldo < 0 ? 'text-amber-800' : 'text-slate-900'}`}>
              {wallet.saldo < 0 ? `−${formatearPrecio(wallet.saldoPendiente)}` : formatearPrecio(wallet.saldoDisponible)}
            </p>
          </div>
          <span className="hidden text-sm font-medium text-marca-700 sm:inline">Ver mi wallet</span>
          <ArrowRight className="h-4 w-4 text-marca-700 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica etiqueta="Servicios activos" valor={activas.length} icono={ClipboardCheck} href="/personal/servicios" contexto={`${porAceptar.length} por aceptar`} />
        <Metrica
          etiqueta="Servicios completados"
          valor={completadas.length}
          icono={CircleCheck}
          tono="exito"
          href="/personal/historial"
          contexto="Desde que te uniste"
        />
        <Metrica
          etiqueta="Calificación promedio"
          valor={promedio.total > 0 ? promedio.promedio.toFixed(1) : '—'}
          icono={Star}
          tono="advertencia"
          contexto={
            promedio.total > 0 ? (
              <span className="flex items-center gap-2">
                <Estrellas valor={promedio.promedio} />
                {promedio.total} {promedio.total === 1 ? 'reseña' : 'reseñas'}
              </span>
            ) : (
              'Aún no tienes calificaciones'
            )
          }
        />
        <Metrica
          etiqueta="Franjas disponibles"
          valor={franjasFuturas.length}
          icono={CalendarClock}
          tono="fresco"
          href="/personal/disponibilidad"
          contexto={franjasFuturas.length > 0 ? 'Registradas desde hoy' : 'Registra tus horarios'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Tarjeta relleno="ninguno" className="lg:col-span-2">
          <EncabezadoTarjeta
            className="px-5 pt-5 sm:px-6"
            titulo="Próximos servicios"
            descripcion="Servicios aceptados o en curso"
            accion={
              <Link href="/personal/agenda" className="text-sm font-medium text-marca-700 hover:underline">
                Ver agenda
              </Link>
            }
          />
          {proximas.length === 0 ? (
            <EstadoVacio compacto icono={CalendarDays} titulo="Sin servicios próximos" descripcion="Cuando aceptes un servicio aparecerá aquí." />
          ) : (
            <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
              {proximas.map((asignacion) => (
                <li key={asignacion.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                  <div className="flex w-full min-w-0 items-start gap-3.5">
                    <BloqueFecha fecha={asignacion.solicitud.fecha} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{asignacion.solicitud.servicio.nombre}</p>
                        <EstadoBadge estado={asignacion.solicitud.estado} />
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-[13px] text-slate-500">
                        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span className="truncate">{asignacion.solicitud.direccion}</span>
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-slate-500">
                        <UserRound className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {nombreCompleto(asignacion.solicitud.cliente)} · {formatearHora(asignacion.solicitud.hora)}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 sm:pl-0">
                    <AccionAsignacion asignacion={asignacion} onActualizado={() => recargar(true)} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>

        <div className="flex flex-col gap-6">
          <Tarjeta relleno="ninguno">
            <EncabezadoTarjeta className="px-5 pt-5" titulo="Tus horarios" descripcion="Próximas franjas registradas" />
            {franjasFuturas.length === 0 ? (
              <EstadoVacio compacto icono={Clock} titulo="Sin franjas registradas" />
            ) : (
              <ul className="mt-3 flex flex-col gap-2 px-5 pb-5">
                {franjasFuturas.slice(0, 4).map((franja) => (
                  <li key={franja.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm">
                    <span className="font-medium text-slate-700">{etiquetaDia(franja.fecha)}</span>
                    <span className="text-slate-500 cifras">
                      {formatearHora(franja.horaInicio)} – {formatearHora(franja.horaFin)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>

          <Tarjeta relleno="ninguno">
            <EncabezadoTarjeta className="px-5 pt-5" titulo="Lo que dicen tus clientes" />
            {resenas.length === 0 ? (
              <EstadoVacio compacto icono={MessageSquareQuote} titulo="Aún no hay comentarios" descripcion="Las reseñas de tus clientes aparecerán aquí." />
            ) : (
              <ul className="mt-3 flex flex-col divide-y divide-slate-100 px-5 pb-2">
                {resenas.map((resena) => (
                  <li key={resena.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <Estrellas valor={resena.puntuacion} />
                      <span className="text-xs text-slate-400">{formatearRelativo(resena.fechaCreacion)}</span>
                    </div>
                    <p className="mt-1.5 text-sm italic leading-relaxed text-slate-600">“{resena.comentario}”</p>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>
        </div>
      </div>

    </div>
  );
}

