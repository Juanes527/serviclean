'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Banknote, CreditCard, Receipt, SearchX } from 'lucide-react';
import { clasesBoton } from '@/components/Boton';
import EncabezadoPagina from '@/components/EncabezadoPagina';
import { EsqueletoLista, EsqueletoMetricas } from '@/components/Esqueleto';
import EstadoBadge from '@/components/EstadoBadge';
import EstadoVacio, { EstadoError } from '@/components/EstadoVacio';
import { CampoBusqueda, FiltroSegmentado, OpcionFiltro } from '@/components/Filtros';
import IconoServicio from '@/components/IconoServicio';
import MetodoPagoTexto from '@/components/MetodoPagoTexto';
import Metrica from '@/components/Metrica';
import Tabla, { CeldaPrincipal, ColumnaTabla } from '@/components/Tabla';
import { pagosServicio } from '@/servicios/pagos.servicio';
import { Pago } from '@/tipos';
import { coincideBusqueda, formatearFechaHora, formatearFechaMedia, formatearPrecio } from '@/utilidades/formato';
import { useCarga } from '@/utilidades/useCarga';

type Filtro = 'TODOS' | 'SIMULADO_TARJETA' | 'EFECTIVO';

export default function MisPagos() {
  const { datos, cargando, error, recargar } = useCarga(() => pagosServicio.misPagos());
  const pagos = useMemo(() => datos ?? [], [datos]);
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  const [busqueda, setBusqueda] = useState('');

  const pagados = pagos.filter((pago) => pago.estado === 'PAGADO');
  const total = pagados.reduce((suma, pago) => suma + Number(pago.monto), 0);
  const conTarjeta = pagados.filter((pago) => pago.metodo === 'SIMULADO_TARJETA');
  const enEfectivo = pagados.filter((pago) => pago.metodo === 'EFECTIVO');

  const opciones: OpcionFiltro<Filtro>[] = [
    { valor: 'TODOS', texto: 'Todos', total: pagos.length },
    { valor: 'SIMULADO_TARJETA', texto: 'Tarjeta', total: pagos.filter((p) => p.metodo === 'SIMULADO_TARJETA').length },
    { valor: 'EFECTIVO', texto: 'Efectivo', total: pagos.filter((p) => p.metodo === 'EFECTIVO').length },
  ];

  const filtrados = pagos
    .filter((pago) => filtro === 'TODOS' || pago.metodo === filtro)
    .filter((pago) => coincideBusqueda(busqueda, pago.solicitud?.servicio.nombre, pago.referencia));

  const columnas: ColumnaTabla<Pago>[] = [
    {
      clave: 'servicio',
      titulo: 'Servicio',
      ocultarEnMovil: true,
      render: (pago) => (
        <CeldaPrincipal
          icono={<IconoServicio icono={pago.solicitud?.servicio.icono} tamano="sm" />}
          titulo={pago.solicitud?.servicio.nombre}
          subtitulo={pago.solicitud ? `Servicio del ${formatearFechaMedia(pago.solicitud.fecha)}` : undefined}
        />
      ),
    },
    { clave: 'fecha', titulo: 'Fecha de pago', render: (pago) => formatearFechaHora(pago.fecha) },
    { clave: 'metodo', titulo: 'Método', render: (pago) => <MetodoPagoTexto pago={pago} /> },
    { clave: 'referencia', titulo: 'Referencia', render: (pago) => <span className="font-mono text-[13px]">{pago.referencia}</span> },
    { clave: 'estado', titulo: 'Estado', ocultarEnMovil: true, render: (pago) => <EstadoBadge tipo="pago" estado={pago.estado} /> },
    {
      clave: 'monto',
      titulo: 'Monto',
      alineacion: 'derecha',
      render: (pago) => <span className="font-semibold text-slate-900">{formatearPrecio(pago.monto)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Mis pagos" descripcion="Historial de los pagos de tus servicios. Los pagos con tarjeta son simulados: no se realiza ningún cobro real." />

      {cargando ? (
        <>
          <EsqueletoMetricas />
          <EsqueletoLista filas={5} />
        </>
      ) : error ? (
        <EstadoError mensaje={error} onReintentar={() => recargar()} />
      ) : pagos.length === 0 ? (
        <EstadoVacio
          icono={Receipt}
          titulo="Aún no has realizado pagos"
          descripcion="Cuando pagues un servicio, aquí verás su referencia y el método utilizado."
          accion={
            <Link href="/cliente/mis-servicios" className={clasesBoton('primario', 'sm')}>
              Ir a mis servicios
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Metrica etiqueta="Total pagado" valor={formatearPrecio(total)} icono={Receipt} tono="exito" contexto={`${pagados.length} pagos realizados`} />
            <Metrica
              etiqueta="Con tarjeta (simulada)"
              valor={formatearPrecio(conTarjeta.reduce((s, p) => s + Number(p.monto), 0))}
              icono={CreditCard}
              contexto={`${conTarjeta.length} pagos en línea`}
            />
            <Metrica
              etiqueta="En efectivo"
              valor={formatearPrecio(enEfectivo.reduce((s, p) => s + Number(p.monto), 0))}
              icono={Banknote}
              tono="fresco"
              contexto={`${enEfectivo.length} pagos al personal`}
            />
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <FiltroSegmentado etiqueta="Filtrar por método" opciones={opciones} valor={filtro} onCambiar={setFiltro} />
            <CampoBusqueda valor={busqueda} onCambiar={setBusqueda} placeholder="Buscar servicio o referencia" />
          </div>

          {filtrados.length === 0 ? (
            <EstadoVacio icono={SearchX} titulo="Sin resultados" descripcion="No hay pagos que coincidan con los filtros." />
          ) : (
            <Tabla
              etiqueta="Historial de pagos"
              columnas={columnas}
              filas={filtrados}
              claveFila={(pago) => pago.id}
              resumenMovil={(pago) => (
                <CeldaPrincipal
                  icono={<IconoServicio icono={pago.solicitud?.servicio.icono} tamano="sm" />}
                  titulo={pago.solicitud?.servicio.nombre}
                  subtitulo={formatearPrecio(pago.monto)}
                />
              )}
              destacadoMovil={(pago) => <EstadoBadge tipo="pago" estado={pago.estado} />}
            />
          )}
        </>
      )}
    </div>
  );
}
