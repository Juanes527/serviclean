'use client';

import { useMemo, useState } from 'react';
import { ClipboardList, Eye, SearchX } from 'lucide-react';
import Boton from '@/components/Boton';
import DetalleSolicitud from '@/components/DetalleSolicitud';
import EncabezadoPagina from '@/components/EncabezadoPagina';
import { EsqueletoLista } from '@/components/Esqueleto';
import EstadoBadge from '@/components/EstadoBadge';
import EstadoVacio, { EstadoError } from '@/components/EstadoVacio';
import { CampoBusqueda, FiltroSegmentado, OpcionFiltro } from '@/components/Filtros';
import IconoServicio from '@/components/IconoServicio';
import Tabla, { CeldaPrincipal, ColumnaTabla } from '@/components/Tabla';
import { reportesServicio } from '@/servicios/reportes.servicio';
import { solicitudesServicio } from '@/servicios/solicitudes.servicio';
import { EstadoSolicitud, Solicitud } from '@/tipos';
import { ESTADOS_SOLICITUD, ORDEN_ESTADOS_SOLICITUD } from '@/utilidades/estados';
import { coincideBusqueda, formatearFechaMedia, formatearHora, formatearPrecio, nombreCompleto } from '@/utilidades/formato';
import { useCarga } from '@/utilidades/useCarga';

type Filtro = 'TODOS' | EstadoSolicitud;

export default function SolicitudesAdmin() {
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [detalle, setDetalle] = useState<Solicitud | null>(null);
  const { datos: conteos } = useCarga(() => reportesServicio.solicitudesPorEstado().catch(() => []));
  const { datos, cargando, error, recargar } = useCarga(
    () => solicitudesServicio.listarTodas(filtro === 'TODOS' ? undefined : filtro),
    [filtro],
  );

  const opciones: OpcionFiltro<Filtro>[] = useMemo(() => {
    const mapa = new Map((conteos ?? []).map((item) => [item.estado, item.total]));
    const total = (conteos ?? []).reduce((suma, item) => suma + item.total, 0);
    return [
      { valor: 'TODOS', texto: 'Todas', total: conteos ? total : undefined },
      ...ORDEN_ESTADOS_SOLICITUD.map((estado) => ({
        valor: estado,
        texto: ESTADOS_SOLICITUD[estado].texto,
        total: conteos ? mapa.get(estado) ?? 0 : undefined,
      })),
    ];
  }, [conteos]);

  const filtradas = useMemo(
    () =>
      (datos ?? []).filter((solicitud) =>
        coincideBusqueda(
          busqueda,
          solicitud.servicio.nombre,
          nombreCompleto(solicitud.cliente),
          nombreCompleto(solicitud.asignacion?.personal),
          solicitud.direccion,
        ),
      ),
    [datos, busqueda],
  );

  const columnas: ColumnaTabla<Solicitud>[] = [
    {
      clave: 'cliente',
      titulo: 'Cliente',
      ocultarEnMovil: true,
      render: (solicitud) => <CeldaPrincipal titulo={nombreCompleto(solicitud.cliente)} subtitulo={solicitud.cliente?.correo} />,
    },
    {
      clave: 'servicio',
      titulo: 'Servicio',
      render: (solicitud) => (
        <span className="flex items-center gap-2">
          <IconoServicio icono={solicitud.servicio.icono} tamano="sm" />
          <span className="truncate">{solicitud.servicio.nombre}</span>
        </span>
      ),
      ocultarEnMovil: true,
    },
    {
      clave: 'fecha',
      titulo: 'Programado',
      render: (solicitud) => (
        <span className="whitespace-nowrap">
          {formatearFechaMedia(solicitud.fecha)}
          <span className="block text-[13px] text-slate-400">{formatearHora(solicitud.hora)}</span>
        </span>
      ),
    },
    {
      clave: 'personal',
      titulo: 'Personal',
      render: (solicitud) =>
        solicitud.asignacion?.personal ? nombreCompleto(solicitud.asignacion.personal) : <span className="text-amber-700">Sin asignar</span>,
    },
    { clave: 'estado', titulo: 'Estado', ocultarEnMovil: true, render: (solicitud) => <EstadoBadge estado={solicitud.estado} /> },
    {
      clave: 'precio',
      titulo: 'Precio',
      alineacion: 'derecha',
      render: (solicitud) => <span className="font-medium text-slate-800">{formatearPrecio(solicitud.servicio.precioBase)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Solicitudes" descripcion="Supervisa todas las solicitudes de servicio y su estado actual." />

      <div className="flex flex-col gap-3">
        <FiltroSegmentado etiqueta="Filtrar por estado" opciones={opciones} valor={filtro} onCambiar={setFiltro} />
        <CampoBusqueda valor={busqueda} onCambiar={setBusqueda} placeholder="Buscar cliente, servicio o personal" />
      </div>

      {cargando ? (
        <EsqueletoLista filas={6} />
      ) : error ? (
        <EstadoError mensaje={error} onReintentar={() => recargar()} />
      ) : (datos ?? []).length === 0 ? (
        <EstadoVacio
          icono={ClipboardList}
          titulo={filtro === 'TODOS' ? 'Aún no hay solicitudes' : `No hay solicitudes en estado “${ESTADOS_SOLICITUD[filtro].texto.toLowerCase()}”`}
          descripcion="Cuando los clientes soliciten servicios aparecerán aquí."
        />
      ) : filtradas.length === 0 ? (
        <EstadoVacio icono={SearchX} titulo="Sin resultados" descripcion={`Nada coincide con “${busqueda}”.`} />
      ) : (
        <>
          <p className="-mb-2 text-sm text-slate-500">
            Mostrando <span className="font-semibold text-slate-700">{filtradas.length}</span>{' '}
            {filtradas.length === 1 ? 'solicitud' : 'solicitudes'}
          </p>
          <Tabla
            etiqueta="Solicitudes de servicio"
            columnas={columnas}
            filas={filtradas}
            claveFila={(solicitud) => solicitud.id}
            onSeleccionar={setDetalle}
            resumenMovil={(solicitud) => (
              <CeldaPrincipal
                icono={<IconoServicio icono={solicitud.servicio.icono} tamano="sm" />}
                titulo={solicitud.servicio.nombre}
                subtitulo={nombreCompleto(solicitud.cliente)}
              />
            )}
            destacadoMovil={(solicitud) => <EstadoBadge estado={solicitud.estado} />}
            acciones={(solicitud) => (
              <Boton variante="fantasma" tamano="sm" icono={<Eye className="h-4 w-4" />} onClick={() => setDetalle(solicitud)}>
                Detalle
              </Boton>
            )}
          />
        </>
      )}

      <DetalleSolicitud solicitud={detalle} onCerrar={() => setDetalle(null)} mostrarCliente />
    </div>
  );
}
