'use client';

import { ReactNode, useState } from 'react';
import { Printer } from 'lucide-react';
import Boton from '@/components/Boton';
import DistribucionEstados from '@/components/DistribucionEstados';
import EncabezadoPagina from '@/components/EncabezadoPagina';
import { Esqueleto, EsqueletoMetricas } from '@/components/Esqueleto';
import { EstadoError } from '@/components/EstadoVacio';
import FiltroFechas from '@/components/FiltroFechas';
import { FiltroSegmentado } from '@/components/Filtros';
import Tarjeta, { EncabezadoTarjeta } from '@/components/Tarjeta';
import { reportesServicio } from '@/servicios/reportes.servicio';
import { formatearFechaHora, formatearPrecio, nombreCompleto } from '@/utilidades/formato';
import { useCarga } from '@/utilidades/useCarga';

function porcentaje(parte: number, total: number) {
  return total > 0 ? `${Math.round((parte / total) * 100)}%` : '—';
}

function Indicador({ etiqueta, valor, detalle }: { etiqueta: string; valor: ReactNode; detalle?: string }) {
  return (
    <div className="flex flex-col gap-1 border-l-2 border-marca-100 pl-4">
      <dt className="text-sm text-slate-500">{etiqueta}</dt>
      <dd className="font-display text-2xl font-bold text-slate-900 cifras">{valor}</dd>
      {detalle && <dd className="text-xs text-slate-400">{detalle}</dd>}
    </div>
  );
}

export default function ReportesAdmin() {
  const { datos, cargando, error, recargar } = useCarga(() => Promise.all([reportesServicio.resumen(), reportesServicio.solicitudesPorEstado()]));

  const encabezado = (
    <EncabezadoPagina
      titulo="Reportes"
      descripcion="Indicadores de usuarios, solicitudes y finanzas de la plataforma."
      acciones={
        datos && (
          <Boton variante="contorno" icono={<Printer className="h-4 w-4" />} onClick={() => window.print()} className="no-imprimir w-full sm:w-auto">
            Imprimir reporte
          </Boton>
        )
      }
    />
  );

  if (cargando) {
    return (
      <div className="flex flex-col gap-6" role="status" aria-label="Cargando reportes">
        {encabezado}
        <EsqueletoMetricas cantidad={4} />
        <Esqueleto className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error || !datos) {
    return (
      <div className="flex flex-col gap-6">
        {encabezado}
        <EstadoError mensaje={error} onReintentar={() => recargar()} />
      </div>
    );
  }

  const [resumen, porEstado] = datos;
  const totalSolicitudes = porEstado.reduce((suma, item) => suma + item.total, 0);
  const administradores = resumen.totalUsuarios - resumen.totalClientes - resumen.totalPersonal;
  const cerradas = resumen.solicitudesFinalizadas + resumen.solicitudesCanceladas;

  const filasUsuarios = [
    { etiqueta: 'Clientes', valor: resumen.totalClientes, clase: 'bg-sky-400' },
    { etiqueta: 'Personal de aseo', valor: resumen.totalPersonal, clase: 'bg-fresco-500' },
    { etiqueta: 'Administradores', valor: administradores, clase: 'bg-marca-600' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {encabezado}
      <p className="-mt-2 text-xs text-slate-400">Generado el {formatearFechaHora(new Date().toISOString())}</p>

      <Tarjeta>
        <EncabezadoTarjeta titulo="Resumen general" className="mb-6" />
        <dl className="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4">
          <Indicador etiqueta="Ingresos confirmados" valor={formatearPrecio(resumen.ingresosTotales)} detalle={`${resumen.totalPagos} pagos registrados`} />
          <Indicador etiqueta="Solicitudes totales" valor={totalSolicitudes} detalle={`${resumen.solicitudesPendientes} pendientes`} />
          <Indicador etiqueta="Tasa de finalización" valor={porcentaje(resumen.solicitudesFinalizadas, cerradas)} detalle="Sobre solicitudes cerradas" />
          <Indicador etiqueta="Tasa de cancelación" valor={porcentaje(resumen.solicitudesCanceladas, totalSolicitudes)} detalle="Sobre el total de solicitudes" />
        </dl>
      </Tarjeta>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Tarjeta className="lg:col-span-3">
          <EncabezadoTarjeta titulo="Solicitudes por estado" descripcion={`${totalSolicitudes} solicitudes registradas`} className="mb-6" />
          <DistribucionEstados datos={porEstado} />
        </Tarjeta>

        <Tarjeta className="lg:col-span-2">
          <EncabezadoTarjeta titulo="Usuarios" descripcion={`${resumen.totalUsuarios} cuentas registradas`} className="mb-6" />
          <ul className="flex flex-col gap-4">
            {filasUsuarios.map((fila) => (
              <li key={fila.etiqueta}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-slate-600">{fila.etiqueta}</span>
                  <span className="font-semibold text-slate-900 cifras">
                    {fila.valor}
                    <span className="ml-2 text-xs font-normal text-slate-400">{porcentaje(fila.valor, resumen.totalUsuarios)}</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                  <div
                    className={`h-full rounded-full ${fila.clase}`}
                    style={{ width: resumen.totalUsuarios > 0 ? `${(fila.valor / resumen.totalUsuarios) * 100}%` : '0%' }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Tarjeta>
      </div>

      <Tarjeta relleno="ninguno">
        <EncabezadoTarjeta titulo="Detalle de indicadores" className="px-5 pt-5 sm:px-6" />
        <table className="mt-4 w-full text-left text-sm">
          <caption className="sr-only">Detalle de indicadores administrativos</caption>
          <tbody className="divide-y divide-slate-100 border-t border-slate-100">
            {[
              ['Total de usuarios registrados', resumen.totalUsuarios],
              ['Clientes registrados', resumen.totalClientes],
              ['Personal de aseo registrado', resumen.totalPersonal],
              ['Servicios activos en el catálogo', resumen.totalServicios],
              ['Solicitudes pendientes', resumen.solicitudesPendientes],
              ['Servicios finalizados', resumen.solicitudesFinalizadas],
              ['Servicios cancelados', resumen.solicitudesCanceladas],
              ['Pagos registrados', resumen.totalPagos],
              ['Ingresos totales confirmados', formatearPrecio(resumen.ingresosTotales)],
            ].map(([etiqueta, valor]) => (
              <tr key={String(etiqueta)} className="transition-colors hover:bg-slate-50/60">
                <th scope="row" className="px-5 py-3 font-normal text-slate-600 sm:px-6">
                  {etiqueta}
                </th>
                <td className="px-5 py-3 text-right font-semibold text-slate-900 cifras sm:px-6">{valor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Tarjeta>

      <ReportesFinancieros />
    </div>
  );
}

const NOMBRES_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function etiquetaPeriodo(periodo: string, agrupacion: 'mes' | 'semana') {
  if (agrupacion === 'semana') return `Semana del ${new Date(`${periodo}T12:00:00Z`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const [anio, mes] = periodo.split('-');
  return `${NOMBRES_MES[Number(mes) - 1]} ${anio}`;
}

/** Tabla simple de reporte con encabezados y cifras alineadas a la derecha. */
function TablaReporte({ titulo, descripcion, encabezados, filas, pie }: { titulo: string; descripcion?: string; encabezados: string[]; filas: ReactNode[][]; pie?: ReactNode[] }) {
  return (
    <Tarjeta relleno="ninguno">
      <EncabezadoTarjeta titulo={titulo} descripcion={descripcion} className="px-5 pt-5 sm:px-6" />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <caption className="sr-only">{titulo}</caption>
          <thead>
            <tr className="border-y border-slate-200 bg-slate-50/80">
              {encabezados.map((encabezado, indice) => (
                <th key={encabezado} scope="col" className={`whitespace-nowrap px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-6 ${indice > 0 ? 'text-right' : ''}`}>
                  {encabezado}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filas.length === 0 ? (
              <tr>
                <td colSpan={encabezados.length} className="px-6 py-8 text-center text-slate-500">
                  Sin datos en el periodo seleccionado.
                </td>
              </tr>
            ) : (
              filas.map((fila, indiceFila) => (
                <tr key={indiceFila} className="hover:bg-slate-50/60">
                  {fila.map((celda, indice) => (
                    <td key={indice} className={`whitespace-nowrap px-5 py-3 sm:px-6 ${indice > 0 ? 'text-right text-slate-700 cifras' : 'font-medium capitalize-first text-slate-800'}`}>
                      {celda}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {pie && filas.length > 0 && (
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50/60 font-semibold text-slate-900">
                {pie.map((celda, indice) => (
                  <td key={indice} className={`whitespace-nowrap px-5 py-3 sm:px-6 ${indice > 0 ? 'text-right cifras' : ''}`}>
                    {celda}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Tarjeta>
  );
}

function ReportesFinancieros() {
  const [rango, setRango] = useState({ desde: '', hasta: '' });
  const [agrupacion, setAgrupacion] = useState<'mes' | 'semana'>('mes');
  const filtros = { ...rango, agrupacion };
  const { datos, cargando, error, recargar } = useCarga(
    () =>
      Promise.all([
        reportesServicio.resumenFinanciero(filtros),
        reportesServicio.finanzasPorPeriodo(filtros),
        reportesServicio.finanzasPorServicio(filtros),
        reportesServicio.finanzasPersonal(),
        reportesServicio.liquidacionesPorPeriodo(filtros),
      ]),
    [rango.desde, rango.hasta, agrupacion],
  );

  const total = <T,>(lista: T[], campo: (item: T) => number) => lista.reduce((suma, item) => suma + campo(item), 0);

  return (
    <section aria-labelledby="titulo-reportes-financieros" className="flex flex-col gap-6 border-t border-slate-200 pt-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 id="titulo-reportes-financieros" className="text-xl font-bold text-slate-900">
            Reportes financieros
          </h2>
          <p className="mt-1 text-sm text-slate-500">Ingresos, comisiones, dinero del personal y liquidaciones. Los pagos con tarjeta son simulados.</p>
        </div>
        <div className="no-imprimir flex flex-col gap-3 sm:flex-row sm:items-end">
          <FiltroSegmentado
            etiqueta="Agrupar por"
            valor={agrupacion}
            onCambiar={setAgrupacion}
            opciones={[
              { valor: 'mes', texto: 'Mes' },
              { valor: 'semana', texto: 'Semana' },
            ]}
          />
          <FiltroFechas desde={rango.desde} hasta={rango.hasta} onCambiar={setRango} />
        </div>
      </div>

      {cargando ? (
        <Esqueleto className="h-64 rounded-2xl" />
      ) : error || !datos ? (
        <EstadoError mensaje={error} onReintentar={() => recargar()} />
      ) : (
        (() => {
          const [resumen, periodos, servicios, personal, liquidaciones] = datos;
          return (
            <>
              <Tarjeta>
                <EncabezadoTarjeta titulo="Ingresos y comisión" className="mb-6" />
                <dl className="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4">
                  <Indicador etiqueta="Ingresos brutos por servicios" valor={formatearPrecio(resumen.servicios.ingresosBrutos)} detalle={`${resumen.servicios.cantidadPagos} servicios pagados`} />
                  <Indicador etiqueta="Por tarjeta simulada" valor={formatearPrecio(resumen.plataforma.tarjetaSimulada)} detalle={`${resumen.plataforma.cantidadTarjeta} pagos recibidos por la plataforma`} />
                  <Indicador etiqueta="Servicios pagados en efectivo" valor={formatearPrecio(resumen.efectivo.entregadoAlPersonal)} detalle={`${resumen.efectivo.cantidad} pagos recibidos por el personal`} />
                  <Indicador etiqueta={`Comisión ServiClean (${resumen.porcentajeComision}%)`} valor={formatearPrecio(resumen.serviclean.comision)} detalle={`Personal: ${formatearPrecio(resumen.personal.generado)}`} />
                  <Indicador etiqueta="Total liquidado" valor={formatearPrecio(resumen.personal.liquidado)} detalle={`${resumen.personal.cantidadLiquidaciones} liquidaciones pagadas`} />
                  <Indicador etiqueta="Liquidaciones pendientes" valor={formatearPrecio(resumen.personal.liquidacionesPendientes)} detalle={`${resumen.personal.cantidadLiquidacionesPendientes} por pagar`} />
                  <Indicador etiqueta="Saldo por liquidar" valor={formatearPrecio(resumen.personal.saldoPorLiquidar)} detalle="Saldos positivos actuales" />
                  <Indicador etiqueta="Saldos pendientes del personal" valor={formatearPrecio(resumen.personal.saldosPendientes)} detalle="Saldos negativos actuales" />
                </dl>
              </Tarjeta>

              <TablaReporte
                titulo={`Comisión por ${agrupacion === 'mes' ? 'mes' : 'semana'}`}
                encabezados={['Periodo', 'Servicios', 'Ingresos', 'Tarjeta', 'Efectivo', 'Comisión', 'Personal']}
                filas={periodos.map((p) => [
                  etiquetaPeriodo(p.periodo, agrupacion),
                  p.cantidad,
                  formatearPrecio(p.ingresos),
                  formatearPrecio(p.recibidoPlataforma),
                  formatearPrecio(p.efectivo),
                  formatearPrecio(p.comision),
                  formatearPrecio(p.personal),
                ])}
                pie={[
                  'Total',
                  total(periodos, (p) => p.cantidad),
                  formatearPrecio(total(periodos, (p) => p.ingresos)),
                  formatearPrecio(total(periodos, (p) => p.recibidoPlataforma)),
                  formatearPrecio(total(periodos, (p) => p.efectivo)),
                  formatearPrecio(total(periodos, (p) => p.comision)),
                  formatearPrecio(total(periodos, (p) => p.personal)),
                ]}
              />

              <TablaReporte
                titulo="Comisión por servicio"
                encabezados={['Servicio', 'Cantidad', 'Ingresos', 'Comisión', 'Personal']}
                filas={servicios.map((s) => [s.servicio, s.cantidad, formatearPrecio(s.ingresos), formatearPrecio(s.comision), formatearPrecio(s.personal)])}
              />

              <TablaReporte
                titulo="Personal de aseo"
                descripcion="Totales históricos y saldo actual de cada trabajador"
                encabezados={['Trabajador', 'Generado', 'Por tarjeta', 'Efectivo recibido', 'Liquidado', 'Saldo disponible', 'Saldo pendiente']}
                filas={personal.map((w) => [
                  nombreCompleto(w.personal),
                  formatearPrecio(w.totalGenerado),
                  formatearPrecio(w.generadoTarjeta),
                  formatearPrecio(w.efectivoRecibido),
                  formatearPrecio(w.totalLiquidado),
                  formatearPrecio(w.saldoDisponible),
                  w.saldoPendiente > 0 ? <span className="text-red-600">{formatearPrecio(w.saldoPendiente)}</span> : formatearPrecio(0),
                ])}
              />

              <TablaReporte
                titulo={`Liquidaciones por ${agrupacion === 'mes' ? 'mes' : 'semana'}`}
                encabezados={['Periodo', 'Cantidad', 'Pagado', 'Pendiente']}
                filas={liquidaciones.map((l) => [etiquetaPeriodo(l.periodo, agrupacion), l.cantidad, formatearPrecio(l.pagado), formatearPrecio(l.pendiente)])}
                pie={[
                  'Total',
                  total(liquidaciones, (l) => l.cantidad),
                  formatearPrecio(total(liquidaciones, (l) => l.pagado)),
                  formatearPrecio(total(liquidaciones, (l) => l.pendiente)),
                ]}
              />
            </>
          );
        })()
      )}
    </section>
  );
}
