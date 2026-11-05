'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ClipboardList, CreditCard, Eye, History, Plus, SearchX, XCircle } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useAvisos } from '@/components/Avisos';
import Boton, { clasesBoton } from '@/components/Boton';
import DetalleSolicitud from '@/components/DetalleSolicitud';
import DialogoConfirmacion from '@/components/DialogoConfirmacion';
import EncabezadoPagina from '@/components/EncabezadoPagina';
import { EsqueletoLista } from '@/components/Esqueleto';
import EstadoBadge from '@/components/EstadoBadge';
import EstadoVacio, { EstadoError } from '@/components/EstadoVacio';
import { CampoBusqueda, FiltroSegmentado, OpcionFiltro } from '@/components/Filtros';
import IconoServicio from '@/components/IconoServicio';
import ModalPago from '@/components/ModalPago';
import Tabla, { CeldaPrincipal, ColumnaTabla } from '@/components/Tabla';
import { solicitudesServicio } from '@/servicios/solicitudes.servicio';
import { Solicitud } from '@/tipos';
import { mensajeError } from '@/utilidades/errores';
import { ESTADOS_CERRADOS } from '@/utilidades/estados';
import { coincideBusqueda, formatearFechaMedia, formatearHora, formatearPrecio, marcaServicio, nombreCompleto } from '@/utilidades/formato';
import { useCarga } from '@/utilidades/useCarga';

/** Solo servicios activos: los finalizados y cancelados pasan al historial. */
type Filtro = 'TODOS' | 'POR_ASIGNAR' | 'ASIGNADOS' | 'EN_PROCESO' | 'POR_PAGAR';

const esActiva = (solicitud: Solicitud) => !ESTADOS_CERRADOS.includes(solicitud.estado);
const puedePagar = (solicitud: Solicitud) => !solicitud.pago;

const CRITERIOS: Record<Filtro, (solicitud: Solicitud) => boolean> = {
  TODOS: () => true,
  POR_ASIGNAR: (solicitud) => solicitud.estado === 'PENDIENTE',
  ASIGNADOS: (solicitud) => solicitud.estado === 'ASIGNADO' || solicitud.estado === 'ACEPTADO',
  EN_PROCESO: (solicitud) => solicitud.estado === 'EN_PROCESO',
  POR_PAGAR: puedePagar,
};

export default function MisServicios() {
  const { avisar } = useAvisos();
  const { datos, cargando, error, recargar } = useCarga(() => solicitudesServicio.misSolicitudes());
  const solicitudes = useMemo(
    () => (datos ?? []).filter(esActiva).sort((a, b) => marcaServicio(a.fecha, a.hora) - marcaServicio(b.fecha, b.hora)),
    [datos],
  );
  const tieneHistorial = (datos ?? []).length > solicitudes.length;
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [detalle, setDetalle] = useState<Solicitud | null>(null);
  const [aCancelar, setACancelar] = useState<Solicitud | null>(null);
  const [modalPago, setModalPago] = useState<Solicitud | null>(null);
  const [procesando, setProcesando] = useState(false);

  const opciones: OpcionFiltro<Filtro>[] = useMemo(
    () =>
      (
        [
          ['TODOS', 'Todos'],
          ['POR_ASIGNAR', 'Por asignar'],
          ['ASIGNADOS', 'Asignados'],
          ['EN_PROCESO', 'En proceso'],
          ['POR_PAGAR', 'Por pagar'],
        ] as [Filtro, string][]
      ).map(([valor, texto]) => ({ valor, texto, total: solicitudes.filter(CRITERIOS[valor]).length })),
    [solicitudes],
  );

  const filtradas = useMemo(
    () =>
      solicitudes
        .filter(CRITERIOS[filtro])
        .filter((solicitud) => coincideBusqueda(busqueda, solicitud.servicio.nombre, solicitud.direccion)),
    [solicitudes, filtro, busqueda],
  );

  const abrirPago = (solicitud: Solicitud) => {
    setDetalle(null);
    setModalPago(solicitud);
  };

  const cancelar = async () => {
    if (!aCancelar) return;
    setProcesando(true);
    try {
      await solicitudesServicio.cancelar(aCancelar.id);
      avisar({ tipo: 'exito', titulo: 'Solicitud cancelada', descripcion: aCancelar.servicio.nombre });
      setACancelar(null);
      setDetalle(null);
      await recargar(true);
    } catch (excepcion) {
      avisar({ tipo: 'error', titulo: 'No se pudo cancelar', descripcion: mensajeError(excepcion, 'No fue posible cancelar la solicitud.') });
    } finally {
      setProcesando(false);
    }
  };

  const columnas: ColumnaTabla<Solicitud>[] = [
    {
      clave: 'servicio',
      titulo: 'Servicio',
      ocultarEnMovil: true,
      render: (solicitud) => (
        <CeldaPrincipal
          icono={<IconoServicio icono={solicitud.servicio.icono} tamano="sm" />}
          titulo={solicitud.servicio.nombre}
          subtitulo={`${formatearFechaMedia(solicitud.fecha)} · ${formatearHora(solicitud.hora)}`}
        />
      ),
    },
    {
      clave: 'personal',
      titulo: 'Personal',
      render: (solicitud) =>
        solicitud.asignacion?.personal ? (
          <span className="flex items-center gap-2">
            <Avatar usuario={solicitud.asignacion.personal} tamano="sm" />
            <span className="truncate">{nombreCompleto(solicitud.asignacion.personal)}</span>
          </span>
        ) : (
          <span className="text-slate-400">Sin asignar</span>
        ),
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      ocultarEnMovil: true,
      render: (solicitud) => <EstadoBadge estado={solicitud.estado} />,
    },
    {
      clave: 'pago',
      titulo: 'Pago',
      render: (solicitud) =>
        solicitud.pago ? <EstadoBadge tipo="pago" estado={solicitud.pago.estado} /> : <span className="text-slate-400">Sin registrar</span>,
    },
    {
      clave: 'precio',
      titulo: 'Precio',
      alineacion: 'derecha',
      ocultarEnMovil: true,
      render: (solicitud) => <span className="font-medium text-slate-800">{formatearPrecio(solicitud.servicio.precioBase)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Mis servicios"
        descripcion="Tus servicios por asignar y en curso. Los finalizados y cancelados los encuentras en el historial."
        acciones={
          <Link href="/cliente/servicios" className={clasesBoton('primario', 'md', 'w-full sm:w-auto')}>
            <Plus className="h-4 w-4" aria-hidden />
            Nueva solicitud
          </Link>
        }
      />

      {cargando ? (
        <EsqueletoLista filas={5} />
      ) : error ? (
        <EstadoError mensaje={error} onReintentar={() => recargar()} />
      ) : solicitudes.length === 0 ? (
        <EstadoVacio
          icono={ClipboardList}
          titulo={tieneHistorial ? 'No tienes servicios en curso' : 'Aún no has solicitado servicios'}
          descripcion={
            tieneHistorial
              ? 'Tus servicios finalizados y cancelados están en el historial.'
              : 'Explora el catálogo y agenda tu primera limpieza en pocos pasos.'
          }
          accion={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/cliente/servicios" className={clasesBoton('primario', 'sm')}>
                {tieneHistorial ? 'Nueva solicitud' : 'Ver catálogo'}
              </Link>
              {tieneHistorial && (
                <Link href="/cliente/historial" className={clasesBoton('contorno', 'sm')}>
                  <History className="h-4 w-4" aria-hidden />
                  Ver historial
                </Link>
              )}
            </div>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <FiltroSegmentado etiqueta="Filtrar solicitudes" opciones={opciones} valor={filtro} onCambiar={setFiltro} />
            <CampoBusqueda valor={busqueda} onCambiar={setBusqueda} placeholder="Buscar por servicio o dirección" />
          </div>

          {filtradas.length === 0 ? (
            <EstadoVacio
              icono={SearchX}
              titulo="No hay solicitudes con estos filtros"
              descripcion="Prueba con otro estado o limpia la búsqueda."
              accion={
                <Boton
                  variante="contorno"
                  tamano="sm"
                  onClick={() => {
                    setFiltro('TODOS');
                    setBusqueda('');
                  }}
                >
                  Ver todas
                </Boton>
              }
            />
          ) : (
            <Tabla
              etiqueta="Mis solicitudes de servicio"
              columnas={columnas}
              filas={filtradas}
              claveFila={(solicitud) => solicitud.id}
              onSeleccionar={setDetalle}
              resumenMovil={(solicitud) => (
                <CeldaPrincipal
                  icono={<IconoServicio icono={solicitud.servicio.icono} tamano="sm" />}
                  titulo={solicitud.servicio.nombre}
                  subtitulo={`${formatearFechaMedia(solicitud.fecha)} · ${formatearHora(solicitud.hora)}`}
                />
              )}
              destacadoMovil={(solicitud) => <EstadoBadge estado={solicitud.estado} />}
              acciones={(solicitud) => (
                <>
                  {puedePagar(solicitud) && (
                    <Boton variante="secundario" tamano="sm" icono={<CreditCard className="h-4 w-4" />} onClick={() => abrirPago(solicitud)}>
                      Pagar
                    </Boton>
                  )}
                  <Boton variante="fantasma" tamano="sm" icono={<Eye className="h-4 w-4" />} onClick={() => setDetalle(solicitud)}>
                    Detalles
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
              <Boton
                variante="fantasmaPeligro"
                className="sm:mr-auto"
                icono={<XCircle className="h-4 w-4" />}
                onClick={() => {
                  setACancelar(detalle);
                  setDetalle(null);
                }}
              >
                Cancelar solicitud
              </Boton>
              {puedePagar(detalle) ? (
                <Boton icono={<CreditCard className="h-4 w-4" />} onClick={() => abrirPago(detalle)}>
                  Pagar servicio
                </Boton>
              ) : (
                <Boton variante="contorno" onClick={() => setDetalle(null)}>
                  Cerrar
                </Boton>
              )}
            </>
          )
        }
      />

      <DialogoConfirmacion
        abierto={!!aCancelar}
        peligroso
        titulo="¿Cancelar esta solicitud?"
        descripcion={
          aCancelar && (
            <>
              Se cancelará <strong className="font-semibold text-slate-700">{aCancelar.servicio.nombre}</strong> del{' '}
              {formatearFechaMedia(aCancelar.fecha)}. Esta acción no se puede deshacer.
            </>
          )
        }
        textoConfirmar="Sí, cancelar"
        textoCancelar="Mantener"
        procesando={procesando}
        onConfirmar={cancelar}
        onCancelar={() => setACancelar(null)}
      />

      <ModalPago solicitud={modalPago} onCerrar={() => setModalPago(null)} onPagado={() => recargar(true)} />
    </div>
  );
}
