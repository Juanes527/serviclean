'use client';

import { useMemo, useState } from 'react';
import { History, SearchX } from 'lucide-react';
import AccionAsignacion from '@/components/AccionAsignacion';
import EncabezadoPagina from '@/components/EncabezadoPagina';
import { EsqueletoLista } from '@/components/Esqueleto';
import EstadoBadge from '@/components/EstadoBadge';
import EstadoVacio, { EstadoError } from '@/components/EstadoVacio';
import { Estrellas } from '@/components/Estrellas';
import { CampoBusqueda, FiltroSegmentado } from '@/components/Filtros';
import IconoServicio from '@/components/IconoServicio';
import Tabla, { CeldaPrincipal, ColumnaTabla } from '@/components/Tabla';
import { AsignacionConSolicitud, asignacionesServicio } from '@/servicios/asignaciones.servicio';
import { ESTADOS_CERRADOS } from '@/utilidades/estados';
import { coincideBusqueda, formatearFechaMedia, formatearPrecio, marcaServicio, nombreCompleto } from '@/utilidades/formato';
import { useCarga } from '@/utilidades/useCarga';

type Filtro = 'TODOS' | 'FINALIZADO' | 'CANCELADO';

export default function HistorialPersonal() {
  const { datos, cargando, error, recargar } = useCarga(() => asignacionesServicio.misAsignaciones());
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  const [busqueda, setBusqueda] = useState('');

  const historial = useMemo(
    () =>
      (datos ?? [])
        .filter((a) => ESTADOS_CERRADOS.includes(a.solicitud.estado))
        .sort((a, b) => marcaServicio(b.solicitud.fecha, b.solicitud.hora) - marcaServicio(a.solicitud.fecha, a.solicitud.hora)),
    [datos],
  );
  const filtrados = historial
    .filter((a) => filtro === 'TODOS' || a.solicitud.estado === filtro)
    .filter((a) => coincideBusqueda(busqueda, a.solicitud.servicio.nombre, nombreCompleto(a.solicitud.cliente)));

  const columnas: ColumnaTabla<AsignacionConSolicitud>[] = [
    {
      clave: 'servicio',
      titulo: 'Servicio',
      ocultarEnMovil: true,
      render: (a) => (
        <CeldaPrincipal
          icono={<IconoServicio icono={a.solicitud.servicio.icono} tamano="sm" apagado={a.solicitud.estado === 'CANCELADO'} />}
          titulo={a.solicitud.servicio.nombre}
          subtitulo={formatearFechaMedia(a.solicitud.fecha)}
        />
      ),
    },
    { clave: 'cliente', titulo: 'Cliente', render: (a) => nombreCompleto(a.solicitud.cliente) || '—' },
    { clave: 'estado', titulo: 'Estado', ocultarEnMovil: true, render: (a) => <EstadoBadge estado={a.solicitud.estado} /> },
    {
      clave: 'calificacion',
      titulo: 'Calificación',
      render: (a) =>
        a.solicitud.calificacion ? <Estrellas valor={a.solicitud.calificacion.puntuacion} /> : <span className="text-slate-400">Sin calificar</span>,
    },
    {
      clave: 'valor',
      titulo: 'Valor',
      alineacion: 'derecha',
      render: (a) => <span className="font-medium text-slate-800">{formatearPrecio(a.solicitud.servicio.precioBase)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Historial" descripcion="Servicios que finalizaste o que fueron cancelados." />

      {cargando ? (
        <EsqueletoLista filas={5} />
      ) : error ? (
        <EstadoError mensaje={error} onReintentar={() => recargar()} />
      ) : historial.length === 0 ? (
        <EstadoVacio icono={History} titulo="Aún no tienes historial" descripcion="Los servicios finalizados o cancelados aparecerán aquí." />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <FiltroSegmentado
              etiqueta="Filtrar historial"
              valor={filtro}
              onCambiar={setFiltro}
              opciones={[
                { valor: 'TODOS', texto: 'Todos', total: historial.length },
                { valor: 'FINALIZADO', texto: 'Finalizados', total: historial.filter((a) => a.solicitud.estado === 'FINALIZADO').length },
                { valor: 'CANCELADO', texto: 'Cancelados', total: historial.filter((a) => a.solicitud.estado === 'CANCELADO').length },
              ]}
            />
            <CampoBusqueda valor={busqueda} onCambiar={setBusqueda} placeholder="Buscar servicio o cliente" />
          </div>
          {filtrados.length === 0 ? (
            <EstadoVacio icono={SearchX} titulo="Sin resultados" descripcion="No hay servicios que coincidan con los filtros." />
          ) : (
            <Tabla
              etiqueta="Historial de servicios realizados"
              columnas={columnas}
              filas={filtrados}
              claveFila={(a) => a.id}
              resumenMovil={(a) => (
                <CeldaPrincipal
                  icono={<IconoServicio icono={a.solicitud.servicio.icono} tamano="sm" apagado={a.solicitud.estado === 'CANCELADO'} />}
                  titulo={a.solicitud.servicio.nombre}
                  subtitulo={formatearFechaMedia(a.solicitud.fecha)}
                />
              )}
              destacadoMovil={(a) => <EstadoBadge estado={a.solicitud.estado} />}
              // Servicios finalizados con efectivo pendiente: aquí se marca como recibido.
              acciones={(a) => <AccionAsignacion asignacion={a} onActualizado={() => recargar(true)} />}
            />
          )}
        </>
      )}
    </div>
  );
}
