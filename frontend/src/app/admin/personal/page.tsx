'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ChevronRight, SearchX, TrendingDown, TrendingUp, UsersRound, Wallet } from 'lucide-react';
import Avatar from '@/components/Avatar';
import EncabezadoPagina from '@/components/EncabezadoPagina';
import { EsqueletoLista, EsqueletoMetricas } from '@/components/Esqueleto';
import { Insignia } from '@/components/EstadoBadge';
import EstadoVacio, { EstadoError } from '@/components/EstadoVacio';
import { CampoBusqueda, FiltroSegmentado } from '@/components/Filtros';
import Metrica from '@/components/Metrica';
import Tabla, { CeldaPrincipal, ColumnaTabla } from '@/components/Tabla';
import { walletServicio } from '@/servicios/wallet.servicio';
import { ResumenWallet } from '@/tipos';
import { coincideBusqueda, formatearPrecio, nombreCompleto, referenciaLiquidacion } from '@/utilidades/formato';
import { useCarga } from '@/utilidades/useCarga';

type Filtro = 'TODOS' | 'POSITIVO' | 'NEGATIVO';

function SaldoWallet({ saldo }: { saldo: number }) {
  if (saldo < 0) return <span className="font-semibold text-red-600">−{formatearPrecio(Math.abs(saldo))}</span>;
  return <span className={`font-semibold ${saldo > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>{formatearPrecio(saldo)}</span>;
}

export default function WalletsPersonal() {
  const { datos, cargando, error, recargar } = useCarga(() => walletServicio.listar());
  const wallets = useMemo(() => datos ?? [], [datos]);
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  const [busqueda, setBusqueda] = useState('');

  const filtradas = wallets
    .filter((w) => filtro === 'TODOS' || (filtro === 'POSITIVO' ? w.saldo > 0 : w.saldo < 0))
    .filter((w) => coincideBusqueda(busqueda, nombreCompleto(w.personal), w.personal.correo));

  const porLiquidar = wallets.filter((w) => w.saldo > 0).reduce((s, w) => s + w.saldo, 0);
  const deuda = wallets.filter((w) => w.saldo < 0).reduce((s, w) => s + w.saldoPendiente, 0);

  const columnas: ColumnaTabla<ResumenWallet>[] = [
    {
      clave: 'personal',
      titulo: 'Trabajador',
      ocultarEnMovil: true,
      render: (w) => <CeldaPrincipal icono={<Avatar usuario={w.personal} tamano="sm" />} titulo={nombreCompleto(w.personal)} subtitulo={w.personal.correo} />,
    },
    { clave: 'saldo', titulo: 'Saldo actual', alineacion: 'derecha', render: (w) => <SaldoWallet saldo={w.saldo} /> },
    { clave: 'generado', titulo: 'Total generado', alineacion: 'derecha', render: (w) => formatearPrecio(w.totalGenerado) },
    { clave: 'tarjeta', titulo: 'Por tarjeta', alineacion: 'derecha', ocultarEnMovil: true, render: (w) => formatearPrecio(w.generadoTarjeta) },
    { clave: 'efectivo', titulo: 'Por efectivo', alineacion: 'derecha', ocultarEnMovil: true, render: (w) => formatearPrecio(w.generadoEfectivo) },
    { clave: 'liquidado', titulo: 'Liquidado', alineacion: 'derecha', render: (w) => formatearPrecio(w.totalLiquidado) },
    {
      clave: 'pendiente',
      titulo: 'Liquidación',
      render: (w) =>
        w.liquidacionPendiente ? (
          <Insignia tono="advertencia">{referenciaLiquidacion(w.liquidacionPendiente.numero)} por pagar</Insignia>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Wallets del personal" descripcion="Saldo neto de cada trabajador con ServiClean. Selecciona a alguien para ver su historial y liquidaciones." />

      {cargando ? (
        <>
          <EsqueletoMetricas />
          <EsqueletoLista filas={4} />
        </>
      ) : error ? (
        <EstadoError mensaje={error} onReintentar={() => recargar()} />
      ) : wallets.length === 0 ? (
        <EstadoVacio icono={UsersRound} titulo="No hay personal registrado" descripcion="Las wallets se crean para cada integrante del personal de aseo." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Metrica etiqueta="Saldo por liquidar" valor={formatearPrecio(porLiquidar)} icono={TrendingUp} tono="exito" contexto={`${wallets.filter((w) => w.saldo > 0).length} trabajadores con saldo disponible`} />
            <Metrica etiqueta="Saldos pendientes con ServiClean" valor={formatearPrecio(deuda)} icono={TrendingDown} tono="peligro" contexto={`${wallets.filter((w) => w.saldo < 0).length} trabajadores con saldo negativo`} />
            <Metrica etiqueta="Total generado por el personal" valor={formatearPrecio(wallets.reduce((s, w) => s + w.totalGenerado, 0))} icono={Wallet} contexto="Suma de su parte en servicios finalizados" />
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <FiltroSegmentado
              etiqueta="Filtrar por saldo"
              valor={filtro}
              onCambiar={setFiltro}
              opciones={[
                { valor: 'TODOS', texto: 'Todos', total: wallets.length },
                { valor: 'POSITIVO', texto: 'Saldo disponible', total: wallets.filter((w) => w.saldo > 0).length },
                { valor: 'NEGATIVO', texto: 'Saldo pendiente', total: wallets.filter((w) => w.saldo < 0).length },
              ]}
            />
            <CampoBusqueda valor={busqueda} onCambiar={setBusqueda} placeholder="Buscar trabajador" />
          </div>

          {filtradas.length === 0 ? (
            <EstadoVacio icono={SearchX} titulo="Sin resultados" descripcion="Ningún trabajador coincide con los filtros." />
          ) : (
            <Tabla
              etiqueta="Wallets del personal"
              columnas={columnas}
              filas={filtradas}
              claveFila={(w) => w.personal.id}
              resumenMovil={(w) => <CeldaPrincipal icono={<Avatar usuario={w.personal} tamano="sm" />} titulo={nombreCompleto(w.personal)} subtitulo={w.personal.correo} />}
              acciones={(w) => (
                <Link
                  href={`/admin/personal/${w.personal.id}`}
                  className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-[13px] font-semibold text-marca-700 hover:bg-marca-50"
                >
                  Ver wallet <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              )}
            />
          )}
        </>
      )}
    </div>
  );
}
