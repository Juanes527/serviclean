'use client';

import { useMemo, useState } from 'react';
import { Check, SearchX, Shuffle, UserRoundCog } from 'lucide-react';
import Alerta from '@/components/Alerta';
import Avatar from '@/components/Avatar';
import { useAvisos } from '@/components/Avisos';
import Boton from '@/components/Boton';
import EncabezadoPagina from '@/components/EncabezadoPagina';
import { EsqueletoLista } from '@/components/Esqueleto';
import EstadoBadge, { Insignia } from '@/components/EstadoBadge';
import EstadoVacio, { EstadoError } from '@/components/EstadoVacio';
import { CampoBusqueda, FiltroSegmentado } from '@/components/Filtros';
import IconoServicio from '@/components/IconoServicio';
import Modal from '@/components/Modal';
import Tabla, { CeldaPrincipal, ColumnaTabla } from '@/components/Tabla';
import { AsignacionConSolicitud, asignacionesServicio } from '@/servicios/asignaciones.servicio';
import { usuariosServicio } from '@/servicios/usuarios.servicio';
import { mensajeError } from '@/utilidades/errores';
import { ESTADOS_CERRADOS } from '@/utilidades/estados';
import { coincideBusqueda, formatearFechaMedia, formatearHora, nombreCompleto } from '@/utilidades/formato';
import { useCarga } from '@/utilidades/useCarga';

type Filtro = 'ACTIVAS' | 'CERRADAS' | 'TODAS';

export default function AsignacionesAdmin() {
  const { avisar } = useAvisos();
  const { datos, cargando, error: errorCarga, recargar } = useCarga(() =>
    Promise.all([asignacionesServicio.listarTodas(), usuariosServicio.listar('PERSONAL_ASEO')]),
  );
  const [filtro, setFiltro] = useState<Filtro>('ACTIVAS');
  const [busqueda, setBusqueda] = useState('');
  const [asignacionSeleccionada, setAsignacionSeleccionada] = useState<AsignacionConSolicitud | null>(null);
  const [personalSeleccionado, setPersonalSeleccionado] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [asignaciones, personal] = datos ?? [[], []];
  const esActiva = (a: AsignacionConSolicitud) => !ESTADOS_CERRADOS.includes(a.solicitud.estado);

  const filtradas = useMemo(
    () =>
      asignaciones
        .filter((a) => (filtro === 'TODAS' ? true : filtro === 'ACTIVAS' ? esActiva(a) : !esActiva(a)))
        .filter((a) => coincideBusqueda(busqueda, a.solicitud.servicio.nombre, nombreCompleto(a.solicitud.cliente), nombreCompleto(a.personal))),
    [asignaciones, filtro, busqueda],
  );

  const abrirReasignar = (asignacion: AsignacionConSolicitud) => {
    setAsignacionSeleccionada(asignacion);
    setPersonalSeleccionado(asignacion.personalId);
    setError('');
  };

  const reasignar = async () => {
    if (!asignacionSeleccionada) return;
    setGuardando(true);
    setError('');
    try {
      await asignacionesServicio.reasignar(asignacionSeleccionada.id, personalSeleccionado);
      const nuevo = personal.find((p) => p.id === personalSeleccionado);
      avisar({ tipo: 'exito', titulo: 'Servicio reasignado', descripcion: nuevo ? `Ahora lo atenderá ${nombreCompleto(nuevo)}.` : undefined });
      setAsignacionSeleccionada(null);
      await recargar(true);
    } catch (excepcion) {
      setError(mensajeError(excepcion, 'No fue posible reasignar el servicio.'));
    } finally {
      setGuardando(false);
    }
  };

  const columnas: ColumnaTabla<AsignacionConSolicitud>[] = [
    {
      clave: 'servicio',
      titulo: 'Servicio',
      ocultarEnMovil: true,
      render: (a) => (
        <CeldaPrincipal
          icono={<IconoServicio icono={a.solicitud.servicio.icono} tamano="sm" />}
          titulo={a.solicitud.servicio.nombre}
          subtitulo={`Cliente: ${nombreCompleto(a.solicitud.cliente)}`}
        />
      ),
    },
    {
      clave: 'personal',
      titulo: 'Personal asignado',
      render: (a) => (
        <span className="flex items-center gap-2">
          <Avatar usuario={a.personal} tamano="sm" />
          <span className="truncate font-medium text-slate-800">{nombreCompleto(a.personal)}</span>
        </span>
      ),
    },
    {
      clave: 'fecha',
      titulo: 'Programado',
      render: (a) => `${formatearFechaMedia(a.solicitud.fecha)} · ${formatearHora(a.solicitud.hora)}`,
    },
    { clave: 'estado', titulo: 'Estado', ocultarEnMovil: true, render: (a) => <EstadoBadge estado={a.solicitud.estado} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Asignaciones" descripcion="Consulta quién atiende cada servicio y reasigna cuando sea necesario." />

      {cargando ? (
        <EsqueletoLista filas={6} />
      ) : errorCarga ? (
        <EstadoError mensaje={errorCarga} onReintentar={() => recargar()} />
      ) : asignaciones.length === 0 ? (
        <EstadoVacio icono={UserRoundCog} titulo="No hay asignaciones registradas" descripcion="Las asignaciones se crean cuando una solicitud recibe personal de aseo." />
      ) : (
        <>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <FiltroSegmentado
              etiqueta="Filtrar asignaciones"
              valor={filtro}
              onCambiar={setFiltro}
              opciones={[
                { valor: 'ACTIVAS', texto: 'Activas', total: asignaciones.filter(esActiva).length },
                { valor: 'CERRADAS', texto: 'Cerradas', total: asignaciones.filter((a) => !esActiva(a)).length },
                { valor: 'TODAS', texto: 'Todas', total: asignaciones.length },
              ]}
            />
            <CampoBusqueda valor={busqueda} onCambiar={setBusqueda} placeholder="Buscar servicio, cliente o personal" />
          </div>
          {filtradas.length === 0 ? (
            <EstadoVacio icono={SearchX} titulo="Sin resultados" descripcion="No hay asignaciones que coincidan con los filtros." />
          ) : (
            <Tabla
              etiqueta="Asignaciones de servicio"
              columnas={columnas}
              filas={filtradas}
              claveFila={(a) => a.id}
              resumenMovil={(a) => (
                <CeldaPrincipal
                  icono={<IconoServicio icono={a.solicitud.servicio.icono} tamano="sm" />}
                  titulo={a.solicitud.servicio.nombre}
                  subtitulo={`Cliente: ${nombreCompleto(a.solicitud.cliente)}`}
                />
              )}
              destacadoMovil={(a) => <EstadoBadge estado={a.solicitud.estado} />}
              acciones={(a) => (
                <Boton variante="contorno" tamano="sm" icono={<Shuffle className="h-4 w-4" />} onClick={() => abrirReasignar(a)}>
                  Reasignar
                </Boton>
              )}
            />
          )}
        </>
      )}

      <Modal
        abierto={!!asignacionSeleccionada}
        titulo="Reasignar servicio"
        descripcion={
          asignacionSeleccionada && (
            <>
              {asignacionSeleccionada.solicitud.servicio.nombre} · {formatearFechaMedia(asignacionSeleccionada.solicitud.fecha)},{' '}
              {formatearHora(asignacionSeleccionada.solicitud.hora)}
            </>
          )
        }
        onCerrar={() => setAsignacionSeleccionada(null)}
        pie={
          <>
            <Boton variante="contorno" onClick={() => setAsignacionSeleccionada(null)} disabled={guardando}>
              Cancelar
            </Boton>
            <Boton onClick={reasignar} cargando={guardando} disabled={personalSeleccionado === asignacionSeleccionada?.personalId}>
              Confirmar reasignación
            </Boton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error && <Alerta tipo="error" mensaje={error} />}
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">Selecciona el personal de aseo</legend>
            {personal.length === 0 ? (
              <p className="text-sm text-slate-500">No hay personal de aseo registrado.</p>
            ) : (
              <div className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
                {personal.map((persona) => {
                  const seleccionado = personalSeleccionado === persona.id;
                  const actual = asignacionSeleccionada?.personalId === persona.id;
                  return (
                    <label
                      key={persona.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-[border-color,background-color] duration-150 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-marca-100 ${
                        seleccionado ? 'border-marca-500 bg-marca-50/60' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="personal"
                        value={persona.id}
                        checked={seleccionado}
                        onChange={() => setPersonalSeleccionado(persona.id)}
                        className="sr-only"
                      />
                      <Avatar usuario={persona} tamano="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">{nombreCompleto(persona)}</span>
                        <span className="block truncate text-xs text-slate-500">{persona.telefono}</span>
                      </span>
                      {actual && <Insignia tono="neutro" conPunto={false}>Actual</Insignia>}
                      {persona.estado === 'INACTIVO' && <Insignia tono="advertencia">Inactivo</Insignia>}
                      {seleccionado && <Check className="h-4 w-4 shrink-0 text-marca-600" aria-hidden />}
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>
        </div>
      </Modal>
    </div>
  );
}
