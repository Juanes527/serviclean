'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ClipboardList, CreditCard, Eye, Plus, SearchX, Star, XCircle } from 'lucide-react';
import Alerta from '@/components/Alerta';
import Avatar from '@/components/Avatar';
import { useAvisos } from '@/components/Avisos';
import Boton, { clasesBoton } from '@/components/Boton';
import CampoTextarea from '@/components/CampoTextarea';
import DetalleSolicitud from '@/components/DetalleSolicitud';
import DialogoConfirmacion from '@/components/DialogoConfirmacion';
import EncabezadoPagina from '@/components/EncabezadoPagina';
import { EsqueletoLista } from '@/components/Esqueleto';
import EstadoBadge from '@/components/EstadoBadge';
import EstadoVacio, { EstadoError } from '@/components/EstadoVacio';
import { SelectorEstrellas } from '@/components/Estrellas';
import { CampoBusqueda, FiltroSegmentado, OpcionFiltro } from '@/components/Filtros';
import IconoServicio from '@/components/IconoServicio';
import Modal from '@/components/Modal';
import ModalPago from '@/components/ModalPago';
import Tabla, { CeldaPrincipal, ColumnaTabla } from '@/components/Tabla';
import { calificacionesServicio } from '@/servicios/calificaciones.servicio';
import { solicitudesServicio } from '@/servicios/solicitudes.servicio';
import { Solicitud } from '@/tipos';
import { mensajeError } from '@/utilidades/errores';
import { ESTADOS_CERRADOS } from '@/utilidades/estados';
import { coincideBusqueda, formatearFechaMedia, formatearHora, formatearPrecio, nombreCompleto } from '@/utilidades/formato';
import { useCarga } from '@/utilidades/useCarga';

type Filtro = 'TODOS' | 'EN_CURSO' | 'POR_PAGAR' | 'POR_CALIFICAR' | 'FINALIZADO' | 'CANCELADO';

const puedeCancelar = (solicitud: Solicitud) => !ESTADOS_CERRADOS.includes(solicitud.estado);
const puedePagar = (solicitud: Solicitud) => !solicitud.pago && solicitud.estado !== 'CANCELADO';
const puedeCalificar = (solicitud: Solicitud) => solicitud.estado === 'FINALIZADO' && !solicitud.calificacion;

const CRITERIOS: Record<Filtro, (solicitud: Solicitud) => boolean> = {
  TODOS: () => true,
  EN_CURSO: (solicitud) => !ESTADOS_CERRADOS.includes(solicitud.estado),
  POR_PAGAR: puedePagar,
  POR_CALIFICAR: puedeCalificar,
  FINALIZADO: (solicitud) => solicitud.estado === 'FINALIZADO',
  CANCELADO: (solicitud) => solicitud.estado === 'CANCELADO',
};

export default function MisServicios() {
  const { avisar } = useAvisos();
  const { datos, cargando, error, recargar } = useCarga(() => solicitudesServicio.misSolicitudes());
  const solicitudes = useMemo(() => datos ?? [], [datos]);
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [detalle, setDetalle] = useState<Solicitud | null>(null);
  const [aCancelar, setACancelar] = useState<Solicitud | null>(null);
  const [modalPago, setModalPago] = useState<Solicitud | null>(null);
  const [modalCalificacion, setModalCalificacion] = useState<Solicitud | null>(null);
  const [puntuacion, setPuntuacion] = useState(0);
  const [comentario, setComentario] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [errorModal, setErrorModal] = useState('');

  const opciones: OpcionFiltro<Filtro>[] = useMemo(
    () =>
      (
        [
          ['TODOS', 'Todos'],
          ['EN_CURSO', 'En curso'],
          ['POR_PAGAR', 'Por pagar'],
          ['POR_CALIFICAR', 'Por calificar'],
          ['FINALIZADO', 'Finalizados'],
          ['CANCELADO', 'Cancelados'],
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

  const abrirCalificacion = (solicitud: Solicitud) => {
    setDetalle(null);
    setErrorModal('');
    setPuntuacion(0);
    setComentario('');
    setModalCalificacion(solicitud);
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

  const calificar = async () => {
    if (!modalCalificacion || puntuacion === 0) return;
    setProcesando(true);
    setErrorModal('');
    try {
      await calificacionesServicio.crear(modalCalificacion.id, puntuacion, comentario);
      avisar({ tipo: 'exito', titulo: '¡Gracias por tu calificación!', descripcion: 'Tu opinión nos ayuda a mejorar el servicio.' });
      setModalCalificacion(null);
      await recargar(true);
    } catch (excepcion) {
      setErrorModal(mensajeError(excepcion, 'No fue posible registrar la calificación.'));
    } finally {
      setProcesando(false);
    }
  };

  const accionContextual = (solicitud: Solicitud) => {
    if (puedeCalificar(solicitud)) {
      return (
        <Boton variante="secundario" tamano="sm" icono={<Star className="h-4 w-4" />} onClick={() => abrirCalificacion(solicitud)}>
          Calificar
        </Boton>
      );
    }
    if (puedePagar(solicitud)) {
      return (
        <Boton variante="secundario" tamano="sm" icono={<CreditCard className="h-4 w-4" />} onClick={() => abrirPago(solicitud)}>
          Pagar
        </Boton>
      );
    }
    return null;
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
        descripcion="Consulta el estado de tus solicitudes, paga tus servicios y califica los que ya finalizaron."
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
          titulo="Aún no has solicitado servicios"
          descripcion="Explora el catálogo y agenda tu primera limpieza en pocos pasos."
          accion={
            <Link href="/cliente/servicios" className={clasesBoton('primario', 'sm')}>
              Ver catálogo
            </Link>
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
                  {accionContextual(solicitud)}
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
              {puedeCancelar(detalle) && (
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
              )}
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
              {!puedeCancelar(detalle) && !puedePagar(detalle) && !puedeCalificar(detalle) && (
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

      <Modal
        abierto={!!modalCalificacion}
        titulo="¿Cómo fue tu servicio?"
        onCerrar={() => setModalCalificacion(null)}
        pie={
          <>
            <Boton variante="contorno" onClick={() => setModalCalificacion(null)} disabled={procesando}>
              Ahora no
            </Boton>
            <Boton onClick={calificar} cargando={procesando} disabled={puntuacion === 0}>
              Enviar calificación
            </Boton>
          </>
        }
      >
        {modalCalificacion && (
          <div className="flex flex-col gap-6">
            {errorModal && <Alerta tipo="error" mensaje={errorModal} />}
            <div className="flex flex-col items-center text-center">
              {modalCalificacion.asignacion?.personal ? (
                <>
                  <Avatar usuario={modalCalificacion.asignacion.personal} tamano="lg" />
                  <p className="mt-3 text-sm text-slate-500">
                    Tu servicio de <span className="font-medium text-slate-700">{modalCalificacion.servicio.nombre.toLowerCase()}</span> con
                  </p>
                  <p className="font-display text-lg font-bold text-slate-900">{nombreCompleto(modalCalificacion.asignacion.personal)}</p>
                </>
              ) : (
                <p className="font-display text-lg font-bold text-slate-900">{modalCalificacion.servicio.nombre}</p>
              )}
            </div>
            <SelectorEstrellas valor={puntuacion} onCambiar={setPuntuacion} />
            <CampoTextarea
              etiqueta="Cuéntanos más (opcional)"
              placeholder="¿Qué te gustó? ¿Qué podríamos mejorar?"
              value={comentario}
              onChange={(evento) => setComentario(evento.target.value)}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
