'use client';

import Link from 'next/link';
import { ReactNode, useState } from 'react';
import { ArrowLeftRight, ArrowRight, Banknote, Building2, CreditCard, Landmark, LucideIcon, PiggyBank, TriangleAlert, UsersRound } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { clasesBoton } from '@/components/Boton';
import EncabezadoPagina from '@/components/EncabezadoPagina';
import { Esqueleto, EsqueletoMetricas } from '@/components/Esqueleto';
import { EstadoError } from '@/components/EstadoVacio';
import FiltroFechas from '@/components/FiltroFechas';
import Tarjeta, { EncabezadoTarjeta } from '@/components/Tarjeta';
import { reportesServicio } from '@/servicios/reportes.servicio';
import { walletServicio } from '@/servicios/wallet.servicio';
import { FinanzasPorPeriodo, ResumenFinanciero } from '@/tipos';
import { formatearPrecio, nombreCompleto, referenciaLiquidacion } from '@/utilidades/formato';
import { useCarga } from '@/utilidades/useCarga';

const NOMBRES_MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

function etiquetaMes(periodo: string) {
  const [anio, mes] = periodo.split('-');
  return `${NOMBRES_MES[Number(mes) - 1]} ${anio.slice(2)}`;
}

/** Bloque de una categoría de dinero: cifra principal y desglose. */
function GrupoFinanciero({
  titulo,
  descripcion,
  valor,
  icono: Icono,
  acento,
  filas,
}: {
  titulo: string;
  descripcion: string;
  valor: number;
  icono: LucideIcon;
  acento: string;
  filas: { etiqueta: string; valor: ReactNode }[];
}) {
  return (
    <Tarjeta className="flex flex-col">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${acento}`}>
          <Icono className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">{titulo}</h2>
          <p className="text-xs text-slate-500">{descripcion}</p>
        </div>
      </div>
      <p className="mt-4 font-display text-[28px] font-bold leading-none tracking-tight text-slate-900 cifras">{formatearPrecio(valor)}</p>
      <dl className="mt-4 flex flex-col divide-y divide-slate-100 border-t border-slate-100 text-sm">
        {filas.map((fila) => (
          <div key={fila.etiqueta} className="flex items-center justify-between gap-3 py-2">
            <dt className="text-slate-500">{fila.etiqueta}</dt>
            <dd className="font-medium text-slate-800 cifras">{fila.valor}</dd>
          </div>
        ))}
      </dl>
    </Tarjeta>
  );
}

/** Barra horizontal dividida en dos partes con leyenda. */
function BarraDividida({ partes }: { partes: { etiqueta: string; valor: number; clase: string }[] }) {
  const total = partes.reduce((suma, parte) => suma + parte.valor, 0);
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden>
        {partes.map((parte) => (
          <div key={parte.etiqueta} className={parte.clase} style={{ width: total > 0 ? `${(parte.valor / total) * 100}%` : '0%' }} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
        {partes.map((parte) => (
          <li key={parte.etiqueta} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${parte.clase}`} aria-hidden />
            <span className="text-slate-600">{parte.etiqueta}</span>
            <span className="font-semibold text-slate-900 cifras">{formatearPrecio(parte.valor)}</span>
            <span className="text-xs text-slate-400">{total > 0 ? `${Math.round((parte.valor / total) * 100)}%` : ''}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Ingresos mensuales: barras apiladas comisión / personal. */
function GraficoPeriodos({ datos }: { datos: FinanzasPorPeriodo[] }) {
  const maximo = Math.max(...datos.map((d) => d.ingresos), 1);
  return (
    <div className="flex h-56 items-end gap-3 sm:gap-6" role="img" aria-label="Ingresos por mes: comisión de ServiClean y parte del personal">
      {datos.map((dato) => (
        <div key={dato.periodo} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
          <span className="text-[11px] font-semibold text-slate-600 cifras">{formatearPrecio(dato.ingresos)}</span>
          <div className="flex w-full max-w-16 flex-col overflow-hidden rounded-t-lg" style={{ height: `${(dato.ingresos / maximo) * 75}%` }}>
            <div className="bg-marca-600" style={{ height: `${(dato.comision / dato.ingresos) * 100}%` }} title={`Comisión ${formatearPrecio(dato.comision)}`} />
            <div className="flex-1 bg-fresco-400" title={`Personal ${formatearPrecio(dato.personal)}`} />
          </div>
          <span className="text-xs capitalize text-slate-500">{etiquetaMes(dato.periodo)}</span>
        </div>
      ))}
    </div>
  );
}

export default function FinanzasAdmin() {
  const [rango, setRango] = useState({ desde: '', hasta: '' });
  const { datos, cargando, error, recargar } = useCarga(
    () => Promise.all([reportesServicio.resumenFinanciero(rango), reportesServicio.finanzasPorPeriodo(rango), walletServicio.listar()]),
    [rango.desde, rango.hasta],
  );

  const encabezado = (
    <EncabezadoPagina
      titulo="Finanzas"
      descripcion="Dinero recibido, comisiones de ServiClean, dinero del personal y liquidaciones. Los pagos con tarjeta son simulados."
      acciones={
        <>
          <Link href="/admin/ingresos-egresos" className={clasesBoton('contorno', 'md', 'w-full sm:w-auto')}>
            <ArrowLeftRight className="h-4 w-4" aria-hidden />
            Ingresos y egresos
          </Link>
          <Link href="/admin/liquidaciones" className={clasesBoton('primario', 'md', 'w-full sm:w-auto')}>
            <Landmark className="h-4 w-4" aria-hidden />
            Liquidaciones
          </Link>
        </>
      }
    />
  );

  const filtro = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <p className="text-sm text-slate-500">
        {rango.desde || rango.hasta ? 'Mostrando el periodo seleccionado.' : 'Mostrando todo el historial.'} Los saldos de wallets siempre son los actuales.
      </p>
      <FiltroFechas desde={rango.desde} hasta={rango.hasta} onCambiar={setRango} />
    </div>
  );

  if (cargando) {
    return (
      <div className="flex flex-col gap-6" role="status" aria-label="Cargando finanzas">
        {encabezado}
        {filtro}
        <Esqueleto className="h-36 rounded-2xl" />
        <EsqueletoMetricas cantidad={4} />
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

  const [resumen, periodos, wallets]: [ResumenFinanciero, FinanzasPorPeriodo[], Awaited<ReturnType<typeof walletServicio.listar>>] = datos;
  const { plataforma, efectivo, serviclean, personal, servicios } = resumen;
  const conDeuda = wallets.filter((w) => w.saldo < 0);
  const pendientes = wallets.filter((w) => w.liquidacionPendiente);

  return (
    <div className="flex flex-col gap-6">
      {encabezado}
      {filtro}

      {/* Resumen general */}
      <Tarjeta>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Ingresos por servicios</p>
            <p className="mt-1 font-display text-4xl font-bold tracking-tight text-slate-900 cifras">{formatearPrecio(servicios.ingresosBrutos)}</p>
            <p className="mt-1 text-sm text-slate-500">{servicios.cantidadPagos} servicios pagados · comisión del {resumen.porcentajeComision}%</p>
          </div>
          <div className="flex flex-col gap-5 lg:w-[55%]">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">¿Para quién es el dinero?</p>
              <BarraDividida
                partes={[
                  { etiqueta: 'Comisión ServiClean', valor: serviclean.comision, clase: 'bg-marca-600' },
                  { etiqueta: 'Personal de aseo', valor: personal.generado, clase: 'bg-fresco-400' },
                ]}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">¿Quién recibió el dinero?</p>
              <BarraDividida
                partes={[
                  { etiqueta: 'Plataforma (tarjeta)', valor: plataforma.recibido, clase: 'bg-sky-500' },
                  { etiqueta: 'Personal (efectivo)', valor: efectivo.entregadoAlPersonal, clase: 'bg-amber-400' },
                ]}
              />
            </div>
          </div>
        </div>
      </Tarjeta>

      {/* Las cuatro categorías, sin mezclar */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <GrupoFinanciero
          titulo="Recibido por la plataforma"
          descripcion="Pagos que llegaron a ServiClean"
          valor={plataforma.recibido}
          icono={CreditCard}
          acento="bg-sky-50 text-sky-600"
          filas={[
            { etiqueta: `Tarjeta simulada (${plataforma.cantidadTarjeta})`, valor: formatearPrecio(plataforma.tarjetaSimulada) },
            ...(plataforma.otrosMetodos > 0
              ? [{ etiqueta: `Nequi / transferencia (${plataforma.cantidadOtrosMetodos})`, valor: formatearPrecio(plataforma.otrosMetodos) }]
              : []),
            { etiqueta: 'Reembolsado', valor: formatearPrecio(plataforma.reembolsado) },
            { etiqueta: 'En caja (recibido − liquidado)', valor: formatearPrecio(plataforma.caja) },
          ]}
        />
        <GrupoFinanciero
          titulo="Efectivo entregado al personal"
          descripcion="El cliente pagó directamente al trabajador"
          valor={efectivo.entregadoAlPersonal}
          icono={Banknote}
          acento="bg-amber-50 text-amber-600"
          filas={[
            { etiqueta: 'Servicios en efectivo', valor: efectivo.cantidad },
            { etiqueta: 'Comisión retenida por el personal', valor: formatearPrecio(efectivo.comisionPorCobrar) },
          ]}
        />
        <GrupoFinanciero
          titulo="Comisión de ServiClean"
          descripcion={`Ingreso de la plataforma (${resumen.porcentajeComision}%)`}
          valor={serviclean.comision}
          icono={Building2}
          acento="bg-marca-50 text-marca-600"
          filas={[
            { etiqueta: 'De pagos con tarjeta', valor: formatearPrecio(serviclean.comisionTarjeta) },
            { etiqueta: 'De pagos en efectivo', valor: formatearPrecio(serviclean.comisionEfectivo) },
          ]}
        />
        <GrupoFinanciero
          titulo="Correspondiente al personal"
          descripcion={`${100 - resumen.porcentajeComision}% de cada servicio`}
          valor={personal.generado}
          icono={UsersRound}
          acento="bg-fresco-50 text-fresco-700"
          filas={[
            { etiqueta: `Liquidado (${personal.cantidadLiquidaciones})`, valor: formatearPrecio(personal.liquidado) },
            { etiqueta: `Liquidaciones por pagar (${personal.cantidadLiquidacionesPendientes})`, valor: formatearPrecio(personal.liquidacionesPendientes) },
            { etiqueta: `Saldo por liquidar (${personal.trabajadoresConSaldo})`, valor: formatearPrecio(personal.saldoPorLiquidar) },
            { etiqueta: `Saldos pendientes del personal (${personal.trabajadoresConDeuda})`, valor: formatearPrecio(personal.saldosPendientes) },
          ]}
        />
      </div>

      {(pendientes.length > 0 || conDeuda.length > 0) && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {pendientes.length > 0 && (
            <Link href="/admin/liquidaciones" className="group flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50/60 px-5 py-4 hover:bg-amber-50">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Landmark className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {pendientes.length} {pendientes.length === 1 ? 'liquidación por pagar' : 'liquidaciones por pagar'}
                </p>
                <p className="truncate text-[13px] text-slate-600">
                  {pendientes.map((w) => `${w.personal.nombre} (${referenciaLiquidacion(w.liquidacionPendiente!.numero)})`).join(', ')}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-amber-700 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          )}
          {conDeuda.length > 0 && (
            <Link href="/admin/personal" className="group flex items-center gap-4 rounded-2xl border border-red-200 bg-red-50/50 px-5 py-4 hover:bg-red-50">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <TriangleAlert className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {conDeuda.length} {conDeuda.length === 1 ? 'trabajador con saldo pendiente' : 'trabajadores con saldo pendiente'}
                </p>
                <p className="truncate text-[13px] text-slate-600">
                  {conDeuda.map((w) => `${w.personal.nombre}: ${formatearPrecio(w.saldoPendiente)}`).join(', ')}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-red-600 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Tarjeta className="lg:col-span-3">
          <EncabezadoTarjeta
            titulo="Ingresos por mes"
            descripcion="Reparto entre comisión de ServiClean y personal"
            className="mb-6"
            accion={
              <ul className="flex gap-3 text-xs text-slate-500">
                <li className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-marca-600" aria-hidden /> Comisión
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-fresco-400" aria-hidden /> Personal
                </li>
              </ul>
            }
          />
          {periodos.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">Sin pagos en el periodo.</p> : <GraficoPeriodos datos={periodos} />}
        </Tarjeta>

        <Tarjeta relleno="ninguno" className="lg:col-span-2">
          <EncabezadoTarjeta
            className="px-5 pt-5 sm:px-6"
            titulo="Wallets del personal"
            descripcion="Saldo actual de cada trabajador"
            accion={
              <Link href="/admin/personal" className="text-sm font-medium text-marca-700 hover:underline">
                Ver todas
              </Link>
            }
          />
          <ul className="mt-3 divide-y divide-slate-100">
            {wallets.map((wallet) => (
              <li key={wallet.personal.id}>
                <Link href={`/admin/personal/${wallet.personal.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50 sm:px-6">
                  <Avatar usuario={wallet.personal} tamano="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{nombreCompleto(wallet.personal)}</p>
                    <p className="text-xs text-slate-500">Generado {formatearPrecio(wallet.totalGenerado)}</p>
                  </div>
                  <span className={`text-sm font-semibold cifras ${wallet.saldo < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                    {wallet.saldo < 0 ? `−${formatearPrecio(wallet.saldoPendiente)}` : formatearPrecio(wallet.saldo)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-500 sm:px-6">
            <PiggyBank className="h-4 w-4" aria-hidden />
            Positivo: ServiClean le debe al trabajador. Negativo: el trabajador le debe a ServiClean.
          </div>
        </Tarjeta>
      </div>
    </div>
  );
}
