'use client';

import { useMemo, useState } from 'react';
import { CreditCard, History, SearchX, Star } from 'lucide-react';
import Boton from '@/components/Boton';
import DetalleSolicitud from '@/components/DetalleSolicitud';
import EncabezadoPagina from '@/components/EncabezadoPagina';
import { EsqueletoLista } from '@/components/Esqueleto';
import EstadoBadge from '@/components/EstadoBadge';
import EstadoVacio, { EstadoError } from '@/components/EstadoVacio';
import { Estrellas } from '@/components/Estrellas';
import { CampoBusqueda, FiltroSegmentado } from '@/components/Filtros';
import IconoServicio from '@/components/IconoServicio';
import ModalCalificacion from '@/components/ModalCalificacion';
import ModalPago from '@/components/ModalPago';
import Tabla, { CeldaPrincipal, ColumnaTabla } from '@/components/Tabla';
import { solicitudesServicio } from '@/servicios/solicitudes.servicio';
import { Solicitud } from '@/tipos';
import { ESTADOS_CERRADOS } from '@/utilidades/estados';
import { coincideBusqueda, formatearFechaMedia, formatearPrecio, marcaServicio, nombreCompleto } from '@/utilidades/formato';
import { useCarga } from '@/utilidades/useCarga';

type Filtro = 'TODOS' | 'POR_CALIFICAR' | 'FINALIZADO' | 'CANCELADO';

const puedeCalificar = (solicitud: Solicitud) => solicitud.estado === 'FINALIZADO' && !solicitud.calificacion;
const puedePagar = (solicitud: Solicitud) => solicitud.estado === 'FINALIZADO' && !solicitud.pago;

export default function HistorialCliente() {
  const { datos, cargando, error, recargar } = useCarga(() => solicitudesServicio.misSolicitudes());
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [detalle, setDetalle] = useState<Solicitud | null>(null);
  const [aCalificar, setACalificar] = useState<Solicitud | null>(null);
  const [aPagar, setAPagar] = useState<Solicitud | null>(null);

  const abrir = (abrirModal: (solicitud: Solicitud) => void) => (solicitud: Solicitud) => {
    setDetalle(null);
    abrirModal(solicitud);
  };
  const abrirCalificacion = abrir(setACalificar);
  const abrirPago = abrir(setAPagar);

  const historial = useMemo(
    () =>
      (datos ?? [])
        .filter((solicitud) => ESTADOS_CERRADOS.includes(solicitud.estado))
        .sort((a, b) => marcaServicio(b.fecha, b.hora) - marcaServicio(a.fecha, a.hora)),
    [datos],
  );

  const filtrados = useMemo(
    () =>
      historial
        .filter((solicitud) =>
          filtro === 'TODOS' ? true : filtro === 'POR_CALIFICAR' ? puedeCalificar(solicitud) : solicitud.estado === filtro,
        )
        .filter((solicitud) => coincideBusqueda(busqueda, solicitud.servicio.nombre, nombreCompleto(solicitud.asignacion?.personal))),
    [historial, filtro, busqueda],
  );

  const columnas: ColumnaTabla<Solicitud>[] = [
    {
      clave: 'servicio',
      titulo: 'Servicio',
      ocultarEnMovil: true,
      render: (solicitud) => (
        <CeldaPrincipal
          icono={<IconoServicio icono={solicitud.servicio.icono} tamano="sm" apagado={solicitud.estado === 'CANCELADO'} />}
          titulo={solicitud.servicio.nombre}
          subtitulo={formatearFechaMedia(solicitud.fecha)}
        />
      ),
    },
    {
      clave: 'personal',
      titulo: 'Atendido por',
      render: (solicitud) => nombreCompleto(solicitud.asignacion?.personal) || <span className="text-slate-400">—</span>,
    },
    { clave: 'estado', titulo: 'Estado', ocultarEnMovil: true, render: (solicitud) => <EstadoBadge estado={solicitud.estado} /> },
    {
      clave: 'calificacion',
      titulo: 'Tu calificación',
      render: (solicitud) =>
        solicitud.calificacion ? (
          <Estrellas valor={solicitud.calificacion.puntuacion} />
        ) : (
          <span className="text-slate-400">{solicitud.estado === 'FINALIZADO' ? 'Sin calificar' : '—'}</span>
        ),
    },
    {
      clave: 'precio',
      titulo: 'Precio',
      alineacion: 'derecha',
      render: (solicitud) => <span className="font-medium text-slate-800">{formatearPrecio(solicitud.servicio.precioBase)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Historial" descripcion="Servicios finalizados y cancelados." />

      {cargando ? (
        <EsqueletoLista filas={5} />
      ) : error ? (
        <EstadoError mensaje={error} onReintentar={() => recargar()} />
      ) : historial.length === 0 ? (
        <EstadoVacio
          icono={History}
          titulo="Tu historial está vacío"
          descripcion="Cuando un servicio finalice o se cancele, lo encontrarás aquí."
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <FiltroSegmentado
              etiqueta="Filtrar historial"
              valor={filtro}
              onCambiar={setFiltro}
              opciones={[
                { valor: 'TODOS', texto: 'Todos', total: historial.length },
                { valor: 'POR_CALIFICAR', texto: 'Por calificar', total: historial.filter(puedeCalificar).length },
                { valor: 'FINALIZADO', texto: 'Finalizados', total: historial.filter((s) => s.estado === 'FINALIZADO').length },
                { valor: 'CANCELADO', texto: 'Cancelados', total: historial.filter((s) => s.estado === 'CANCELADO').length },
              ]}
            />
            <CampoBusqueda valor={busqueda} onCambiar={setBusqueda} placeholder="Buscar servicio o personal" />
          </div>
          {filtrados.length === 0 ? (
            <EstadoVacio icono={SearchX} titulo="Sin resultados" descripcion="No hay servicios que coincidan con los filtros." />
          ) : (
            <Tabla
              etiqueta="Historial de servicios"
              columnas={columnas}
              filas={filtrados}
              claveFila={(solicitud) => solicitud.id}
              onSeleccionar={setDetalle}
              resumenMovil={(solicitud) => (
                <CeldaPrincipal
                  icono={<IconoServicio icono={solicitud.servicio.icono} tamano="sm" apagado={solicitud.estado === 'CANCELADO'} />}
                  titulo={solicitud.servicio.nombre}
                  subtitulo={formatearFechaMedia(solicitud.fecha)}
                />
              )}
              destacadoMovil={(solicitud) => <EstadoBadge estado={solicitud.estado} />}
              acciones={(solicitud) => (
                <>
                  {puedeCalificar(solicitud) ? (
                    <Boton variante="secundario" tamano="sm" icono={<Star className="h-4 w-4" />} onClick={() => abrirCalificacion(solicitud)}>
                      Calificar
                    </Boton>
                  ) : (
                    puedePagar(solicitud) && (
                      <Boton variante="secundario" tamano="sm" icono={<CreditCard className="h-4 w-4" />} onClick={() => abrirPago(solicitud)}>
                        Pagar
                      </Boton>
                    )
                  )}
                  <Boton variante="fantasma" tamano="sm" onClick={() => setDetalle(solicitud)}>
                    Ver detalle
                  </Boton>
                </>
              )}
            />
          )}
        </>
      )}

      <DetalleSolicitud
        solicitud={detalle}
        onCerrar={() => setDetalle(null)}
        acciones={
          detalle && (
            <>
              {puedePagar(detalle) && (
                <Boton variante={puedeCalificar(detalle) ? 'contorno' : 'primario'} icono={<CreditCard className="h-4 w-4" />} onClick={() => abrirPago(detalle)}>
                  Pagar servicio
                </Boton>
              )}
              {puedeCalificar(detalle) && (
                <Boton icono={<Star className="h-4 w-4" />} onClick={() => abrirCalificacion(detalle)}>
                  Calificar servicio
                </Boton>
              )}
              {!puedePagar(detalle) && !puedeCalificar(detalle) && (
                <Boton variante="contorno" onClick={() => setDetalle(null)}>
                  Cerrar
                </Boton>
              )}
            </>
          )
        }
      />
      <ModalCalificacion solicitud={aCalificar} onCerrar={() => setACalificar(null)} onCalificado={() => recargar(true)} />
      <ModalPago solicitud={aPagar} onCerrar={() => setAPagar(null)} onPagado={() => recargar(true)} />
    </div>
  );
}
