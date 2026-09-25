'use client';

import Link from 'next/link';
import { ArrowRight, ChartColumn, ClipboardList, Hourglass, Sparkles, TrendingUp, Users, Wallet } from 'lucide-react';
import { clasesBoton } from '@/components/Boton';
import DistribucionEstados from '@/components/DistribucionEstados';
import EncabezadoPagina from '@/components/EncabezadoPagina';
import { Esqueleto, EsqueletoMetricas } from '@/components/Esqueleto';
import EstadoBadge from '@/components/EstadoBadge';
import EstadoVacio, { EstadoError } from '@/components/EstadoVacio';
import IconoServicio from '@/components/IconoServicio';
import Metrica from '@/components/Metrica';
import Tarjeta, { EncabezadoTarjeta } from '@/components/Tarjeta';
import { pagosServicio } from '@/servicios/pagos.servicio';
import { reportesServicio } from '@/servicios/reportes.servicio';
import { solicitudesServicio } from '@/servicios/solicitudes.servicio';
import { Pago, Solicitud } from '@/tipos';
import { ESTADOS_ACTIVOS } from '@/utilidades/estados';
import { formatearFechaMedia, formatearHora, formatearPrecio, formatearRelativo, nombreCompleto } from '@/utilidades/formato';
import { useCarga } from '@/utilidades/useCarga';

export default function DashboardAdmin() {
  const { datos, cargando, error, recargar } = useCarga(() =>
    Promise.all([
      reportesServicio.resumen(),
      reportesServicio.solicitudesPorEstado(),
      solicitudesServicio.listarTodas().catch((): Solicitud[] => []),
      pagosServicio.listarTodos().catch((): Pago[] => []),
    ]),
  );

  const fechaHoy = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

  const encabezado = (
    <EncabezadoPagina
      titulo="Panel de control"
      descripcion={<span className="capitalize-first inline-block">{fechaHoy} · Resumen general de la operación.</span>}
      acciones={
        <Link href="/admin/reportes" className={clasesBoton('contorno', 'md', 'w-full sm:w-auto')}>
          <ChartColumn className="h-4 w-4" aria-hidden />
          Ver reportes
        </Link>
      }
    />
  );

  if (cargando) {
    return (
      <div className="flex flex-col gap-8" role="status" aria-label="Cargando panel">
        {encabezado}
        <EsqueletoMetricas cantidad={4} />
        <div className="grid gap-6 lg:grid-cols-5">
          <Esqueleto className="h-72 rounded-2xl lg:col-span-3" />
          <Esqueleto className="h-72 rounded-2xl lg:col-span-2" />
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

  const [resumen, porEstado, solicitudes, pagos] = datos;
  const totalSolicitudes = porEstado.reduce((suma, item) => suma + item.total, 0);
  const enCurso = porEstado.filter((item) => ESTADOS_ACTIVOS.includes(item.estado as Solicitud['estado'])).reduce((s, i) => s + i.total, 0);
  const cerradas = resumen.solicitudesFinalizadas + resumen.solicitudesCanceladas;
  const tasaFinalizacion = cerradas > 0 ? Math.round((resumen.solicitudesFinalizadas / cerradas) * 100) : 0;
  const pagosPendientes = pagos.filter((pago) => pago.estado === 'PENDIENTE');
  const recientes = [...solicitudes]
    .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime())
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-8">
      {encabezado}

      {(resumen.solicitudesPendientes > 0 || pagosPendientes.length > 0) && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {resumen.solicitudesPendientes > 0 && (
            <AvisoAtencion
              href="/admin/solicitudes"
              icono={<Hourglass className="h-5 w-5" aria-hidden />}
              titulo={`${resumen.solicitudesPendientes} ${resumen.solicitudesPendientes === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'}`}
              descripcion="Aún no tienen personal asignado."
            />
          )}
          {pagosPendientes.length > 0 && (
            <AvisoAtencion
              href="/admin/pagos"
              icono={<Wallet className="h-5 w-5" aria-hidden />}
              titulo={`${pagosPendientes.length} ${pagosPendientes.length === 1 ? 'pago por verificar' : 'pagos por verificar'}`}
              descripcion={`${formatearPrecio(pagosPendientes.reduce((suma, pago) => suma + Number(pago.monto), 0))} en espera de confirmación.`}
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica
          etiqueta="Ingresos por servicios"
          valor={formatearPrecio(resumen.ingresosTotales)}
          icono={TrendingUp}
          tono="exito"
          href="/admin/finanzas"
          contexto={`${resumen.totalPagos} ${resumen.totalPagos === 1 ? 'pago registrado' : 'pagos registrados'}`}
        />
        <Metrica
          etiqueta="Solicitudes"
          valor={totalSolicitudes}
          icono={ClipboardList}
          href="/admin/solicitudes"
          contexto={`${enCurso} en curso · ${tasaFinalizacion}% finalizadas con éxito`}
        />
        <Metrica
          etiqueta="Usuarios registrados"
          valor={resumen.totalUsuarios}
          icono={Users}
          tono="info"
          href="/admin/usuarios"
          contexto={`${resumen.totalClientes} clientes · ${resumen.totalPersonal} personal de aseo`}
        />
        <Metrica
          etiqueta="Servicios en catálogo"
          valor={resumen.totalServicios}
          icono={Sparkles}
          tono="fresco"
          href="/admin/servicios"
          contexto="Activos y visibles para clientes"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Tarjeta className="lg:col-span-3">
          <EncabezadoTarjeta titulo="Solicitudes por estado" descripcion={`${totalSolicitudes} solicitudes en total`} className="mb-6" />
          <DistribucionEstados datos={porEstado} />
        </Tarjeta>

        <Tarjeta relleno="ninguno" className="flex flex-col lg:col-span-2">
          <EncabezadoTarjeta
            className="px-5 pt-5 sm:px-6"
            titulo="Pagos por verificar"
            accion={
              <Link href="/admin/pagos" className="text-sm font-medium text-marca-700 hover:underline">
                Ver pagos
              </Link>
            }
          />
          {pagosPendientes.length === 0 ? (
            <EstadoVacio compacto icono={Wallet} titulo="Sin pagos pendientes" descripcion="Todos los pagos registrados están verificados." />
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {pagosPendientes.slice(0, 5).map((pago) => (
                <li key={pago.id} className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{nombreCompleto(pago.cliente)}</p>
                    <p className="truncate text-xs text-slate-500">
                      {pago.solicitud?.servicio.nombre} · {formatearRelativo(pago.fecha)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 cifras">{formatearPrecio(pago.monto)}</span>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      <section aria-labelledby="titulo-recientes">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="titulo-recientes" className="text-lg font-semibold text-slate-900">
            Solicitudes recientes
          </h2>
          <Link href="/admin/solicitudes" className="inline-flex items-center gap-1 text-sm font-medium text-marca-700 hover:underline">
            Ver todas <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        {recientes.length === 0 ? (
          <EstadoVacio icono={ClipboardList} titulo="Aún no hay solicitudes" descripcion="Las nuevas solicitudes de los clientes aparecerán aquí." />
        ) : (
          <Tarjeta relleno="ninguno">
            <ul className="divide-y divide-slate-100">
              {recientes.map((solicitud) => (
                <li key={solicitud.id} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
                  <IconoServicio icono={solicitud.servicio.icono} tamano="sm" />
                  <div className="min-w-0 flex-1 sm:grid sm:grid-cols-[1.2fr_1fr_1fr] sm:items-center sm:gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{solicitud.servicio.nombre}</p>
                      <p className="truncate text-[13px] text-slate-500">{nombreCompleto(solicitud.cliente)}</p>
                    </div>
                    <p className="hidden text-sm text-slate-600 sm:block">
                      {formatearFechaMedia(solicitud.fecha)} · {formatearHora(solicitud.hora)}
                    </p>
                    <p className="hidden truncate text-sm text-slate-600 sm:block">
                      {solicitud.asignacion?.personal ? nombreCompleto(solicitud.asignacion.personal) : <span className="text-slate-400">Sin asignar</span>}
                    </p>
                  </div>
                  <EstadoBadge estado={solicitud.estado} />
                </li>
              ))}
            </ul>
          </Tarjeta>
        )}
      </section>
    </div>
  );
}

function AvisoAtencion({ href, icono, titulo, descripcion }: { href: string; icono: React.ReactNode; titulo: string; descripcion: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50/60 px-5 py-4 transition-colors hover:bg-amber-50"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">{icono}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{titulo}</p>
        <p className="text-[13px] text-slate-600">{descripcion}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-amber-700 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
