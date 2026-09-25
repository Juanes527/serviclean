'use client';

import { useMemo, useState } from 'react';
import { History, Landmark, Receipt, SearchX } from 'lucide-react';
import DetalleLiquidacion from '@/components/DetalleLiquidacion';
import EncabezadoPagina from '@/components/EncabezadoPagina';
import { Esqueleto, EsqueletoLista } from '@/components/Esqueleto';
import EstadoBadge from '@/components/EstadoBadge';
import EstadoVacio, { EstadoError } from '@/components/EstadoVacio';
import FiltroFechas from '@/components/FiltroFechas';
import { FiltroSegmentado, OpcionFiltro } from '@/components/Filtros';
import TablaMovimientos from '@/components/TablaMovimientos';
import Tarjeta, { EncabezadoTarjeta } from '@/components/Tarjeta';
import TarjetaWallet, { DesgloseWallet } from '@/components/TarjetaWallet';
import { liquidacionesServicio } from '@/servicios/liquidaciones.servicio';
import { walletServicio } from '@/servicios/wallet.servicio';
import { TipoMovimientoWallet } from '@/tipos';
import { formatearPeriodo, formatearPrecio, referenciaLiquidacion } from '@/utilidades/formato';
import { useCarga } from '@/utilidades/useCarga';

type FiltroTipo = 'TODOS' | TipoMovimientoWallet;

/** Wallet del personal de aseo: solo lectura. Los saldos cambian por pagos, liquidaciones o ajustes del administrador. */
export default function MiWallet() {
  const [rango, setRango] = useState({ desde: '', hasta: '' });
  const [tipo, setTipo] = useState<FiltroTipo>('TODOS');
  const [liquidacionAbierta, setLiquidacionAbierta] = useState<string | null>(null);

  const resumen = useCarga(() => Promise.all([walletServicio.miWallet(), liquidacionesServicio.mias()]));
  const movimientos = useCarga(() => walletServicio.misMovimientos({ ...rango }), [rango.desde, rango.hasta]);

  const filtrados = useMemo(
    () => (movimientos.datos ?? []).filter((m) => tipo === 'TODOS' || m.tipo === tipo),
    [movimientos.datos, tipo],
  );

  const opciones: OpcionFiltro<FiltroTipo>[] = [
    { valor: 'TODOS', texto: 'Todos' },
    { valor: 'INGRESO_SERVICIO', texto: 'Ingresos' },
    { valor: 'PAGO_EFECTIVO', texto: 'Efectivo' },
    { valor: 'LIQUIDACION', texto: 'Liquidaciones' },
    { valor: 'BONIFICACION', texto: 'Bonificaciones' },
    { valor: 'DESCUENTO', texto: 'Descuentos' },
    { valor: 'AJUSTE', texto: 'Ajustes' },
  ];

  const encabezado = (
    <EncabezadoPagina titulo="Mi wallet" descripcion="Tu saldo con ServiClean, el historial de movimientos y tus liquidaciones." />
  );

  if (resumen.cargando) {
    return (
      <div className="flex flex-col gap-6" role="status" aria-label="Cargando wallet">
        {encabezado}
        <Esqueleto className="h-56 rounded-3xl" />
        <EsqueletoLista filas={5} />
      </div>
    );
  }

  if (resumen.error || !resumen.datos) {
    return (
      <div className="flex flex-col gap-6">
        {encabezado}
        <EstadoError mensaje={resumen.error} onReintentar={() => resumen.recargar()} />
      </div>
    );
  }

  const [wallet, liquidaciones] = resumen.datos;

  return (
    <div className="flex flex-col gap-6">
      {encabezado}

      <TarjetaWallet wallet={wallet} />
      <DesgloseWallet wallet={wallet} />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
        <section aria-labelledby="titulo-movimientos" className="flex min-w-0 flex-col gap-4 xl:col-span-2">
          <div className="flex flex-col gap-3">
            <h2 id="titulo-movimientos" className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <History className="h-5 w-5 text-slate-400" aria-hidden /> Historial de movimientos
            </h2>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <FiltroSegmentado etiqueta="Filtrar por tipo" opciones={opciones} valor={tipo} onCambiar={setTipo} />
              <FiltroFechas desde={rango.desde} hasta={rango.hasta} onCambiar={setRango} />
            </div>
          </div>
          {movimientos.cargando ? (
            <EsqueletoLista filas={5} />
          ) : movimientos.error ? (
            <EstadoError mensaje={movimientos.error} onReintentar={() => movimientos.recargar()} />
          ) : filtrados.length === 0 ? (
            <EstadoVacio
              icono={SearchX}
              titulo="Sin movimientos"
              descripcion="Cuando finalices servicios pagados, aquí verás cómo cambia tu saldo."
            />
          ) : (
            <TablaMovimientos movimientos={filtrados} />
          )}
        </section>

        <Tarjeta relleno="ninguno">
          <EncabezadoTarjeta
            className="px-5 pt-5"
            titulo="Mis liquidaciones"
            descripcion="Pagos de ServiClean a tu cuenta"
          />
          {liquidaciones.length === 0 ? (
            <EstadoVacio compacto icono={Landmark} titulo="Sin liquidaciones" descripcion="Tus liquidaciones aparecerán aquí cuando el administrador las genere." />
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {liquidaciones.map((liquidacion) => (
                <li key={liquidacion.id}>
                  <button
                    type="button"
                    onClick={() => setLiquidacionAbierta(liquidacion.id)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <Receipt className="h-4 w-4 text-slate-400" aria-hidden />
                        {referenciaLiquidacion(liquidacion.numero)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{formatearPeriodo(liquidacion.periodoInicio, liquidacion.periodoFin)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-semibold text-slate-900 cifras">{formatearPrecio(liquidacion.monto)}</span>
                      <EstadoBadge tipo="liquidacion" estado={liquidacion.estado} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      <DetalleLiquidacion liquidacionId={liquidacionAbierta} onCerrar={() => setLiquidacionAbierta(null)} />
    </div>
  );
}
