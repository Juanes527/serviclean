'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Pencil, Plus, Power, PowerOff, SearchX, Sparkles } from 'lucide-react';
import Alerta from '@/components/Alerta';
import { useAvisos } from '@/components/Avisos';
import Boton from '@/components/Boton';
import CampoTexto from '@/components/CampoTexto';
import CampoTextarea from '@/components/CampoTextarea';
import DialogoConfirmacion from '@/components/DialogoConfirmacion';
import EncabezadoPagina from '@/components/EncabezadoPagina';
import { EsqueletoLista } from '@/components/Esqueleto';
import { Insignia } from '@/components/EstadoBadge';
import EstadoVacio, { EstadoError } from '@/components/EstadoVacio';
import { CampoBusqueda, FiltroSegmentado } from '@/components/Filtros';
import IconoServicio, { ICONOS_SERVICIO } from '@/components/IconoServicio';
import Modal from '@/components/Modal';
import Tabla, { ColumnaTabla } from '@/components/Tabla';
import { serviciosServicio } from '@/servicios/servicios.servicio';
import { Servicio } from '@/tipos';
import { mensajeError } from '@/utilidades/errores';
import { coincideBusqueda, formatearDuracion, formatearPrecio } from '@/utilidades/formato';
import { useCarga } from '@/utilidades/useCarga';

const VALOR_INICIAL = { nombre: '', descripcion: '', precioBase: '', duracionMinutos: '', icono: 'sparkles' };

type Filtro = 'ACTIVOS' | 'INACTIVOS' | 'TODOS';

export default function ServiciosAdmin() {
  const { avisar } = useAvisos();
  const { datos, cargando, error: errorCarga, recargar } = useCarga(() => serviciosServicio.listar(true));
  const servicios = useMemo(() => datos ?? [], [datos]);
  const [filtro, setFiltro] = useState<Filtro>('ACTIVOS');
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [servicioEditando, setServicioEditando] = useState<Servicio | null>(null);
  const [datosFormulario, setDatosFormulario] = useState(VALOR_INICIAL);
  const [errores, setErrores] = useState<Partial<Record<keyof typeof VALOR_INICIAL, string>>>({});
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [aAlternar, setAAlternar] = useState<Servicio | null>(null);
  const [alternando, setAlternando] = useState(false);

  const filtrados = servicios
    .filter((servicio) => (filtro === 'TODOS' ? true : filtro === 'ACTIVOS' ? servicio.activo : !servicio.activo))
    .filter((servicio) => coincideBusqueda(busqueda, servicio.nombre, servicio.descripcion));

  const abrirCrear = () => {
    setServicioEditando(null);
    setDatosFormulario(VALOR_INICIAL);
    setErrores({});
    setError('');
    setModalAbierto(true);
  };

  const abrirEditar = (servicio: Servicio) => {
    setServicioEditando(servicio);
    setDatosFormulario({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion,
      precioBase: String(Number(servicio.precioBase)),
      duracionMinutos: String(servicio.duracionMinutos),
      icono: servicio.icono || 'sparkles',
    });
    setErrores({});
    setError('');
    setModalAbierto(true);
  };

  const actualizar = (campo: keyof typeof VALOR_INICIAL, valor: string) => {
    setDatosFormulario((anterior) => ({ ...anterior, [campo]: valor }));
    if (errores[campo]) setErrores((anterior) => ({ ...anterior, [campo]: undefined }));
  };

  const guardar = async (evento: FormEvent) => {
    evento.preventDefault();
    setError('');
    const nuevos: typeof errores = {};
    if (!datosFormulario.nombre.trim()) nuevos.nombre = 'El nombre es obligatorio.';
    if (!datosFormulario.descripcion.trim()) nuevos.descripcion = 'Describe brevemente en qué consiste el servicio.';
    if (!datosFormulario.precioBase || Number(datosFormulario.precioBase) <= 0) nuevos.precioBase = 'Ingresa un precio mayor a cero.';
    const duracion = Number(datosFormulario.duracionMinutos);
    if (!Number.isInteger(duracion) || duracion < 15) nuevos.duracionMinutos = 'La duración debe ser un número entero de al menos 15 minutos.';
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    setGuardando(true);
    try {
      const payload = {
        nombre: datosFormulario.nombre.trim(),
        descripcion: datosFormulario.descripcion.trim(),
        precioBase: Number(datosFormulario.precioBase),
        duracionMinutos: Number(datosFormulario.duracionMinutos),
        icono: datosFormulario.icono,
      };
      if (servicioEditando) {
        await serviciosServicio.actualizar(servicioEditando.id, payload);
      } else {
        await serviciosServicio.crear(payload);
      }
      avisar({ tipo: 'exito', titulo: servicioEditando ? 'Servicio actualizado' : 'Servicio creado', descripcion: payload.nombre });
      setModalAbierto(false);
      await recargar(true);
    } catch (excepcion) {
      setError(mensajeError(excepcion, 'No fue posible guardar el servicio.'));
    } finally {
      setGuardando(false);
    }
  };

  const alternarActivo = async () => {
    if (!aAlternar) return;
    setAlternando(true);
    try {
      if (aAlternar.activo) {
        await serviciosServicio.eliminar(aAlternar.id);
      } else {
        await serviciosServicio.actualizar(aAlternar.id, { activo: true });
      }
      avisar({ tipo: 'exito', titulo: aAlternar.activo ? 'Servicio desactivado' : 'Servicio activado', descripcion: aAlternar.nombre });
      setAAlternar(null);
      await recargar(true);
    } catch (excepcion) {
      avisar({ tipo: 'error', titulo: 'No se pudo actualizar el servicio', descripcion: mensajeError(excepcion, 'Inténtalo de nuevo.') });
    } finally {
      setAlternando(false);
    }
  };

  const celdaServicio = (servicio: Servicio) => (
    <div className="flex min-w-0 items-center gap-3">
      <IconoServicio icono={servicio.icono} tamano="sm" apagado={!servicio.activo} />
      <div className="min-w-0">
        <p className={`truncate font-medium ${servicio.activo ? 'text-slate-900' : 'text-slate-500'}`}>{servicio.nombre}</p>
        <p className="max-w-[16rem] truncate text-[13px] text-slate-500" title={servicio.descripcion}>{servicio.descripcion}</p>
      </div>
    </div>
  );

  const columnas: ColumnaTabla<Servicio>[] = [
    { clave: 'servicio', titulo: 'Servicio', ocultarEnMovil: true, render: celdaServicio },
    { clave: 'duracion', titulo: 'Duración', render: (servicio) => formatearDuracion(servicio.duracionMinutos) },
    {
      clave: 'estado',
      titulo: 'Estado',
      ocultarEnMovil: true,
      render: (servicio) => <Insignia tono={servicio.activo ? 'exito' : 'neutro'}>{servicio.activo ? 'Activo' : 'Inactivo'}</Insignia>,
    },
    {
      clave: 'precio',
      titulo: 'Precio base',
      alineacion: 'derecha',
      render: (servicio) => <span className="font-semibold text-slate-900">{formatearPrecio(servicio.precioBase)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Servicios"
        descripcion="Administra el catálogo que ven los clientes: precios, duración y disponibilidad."
        acciones={
          <Boton onClick={abrirCrear} icono={<Plus className="h-4 w-4" />} className="w-full sm:w-auto">
            Nuevo servicio
          </Boton>
        }
      />

      {cargando ? (
        <EsqueletoLista filas={5} />
      ) : errorCarga ? (
        <EstadoError mensaje={errorCarga} onReintentar={() => recargar()} />
      ) : servicios.length === 0 ? (
        <EstadoVacio
          icono={Sparkles}
          titulo="El catálogo está vacío"
          descripcion="Crea el primer servicio para que los clientes puedan solicitarlo."
          accion={
            <Boton tamano="sm" onClick={abrirCrear} icono={<Plus className="h-4 w-4" />}>
              Crear servicio
            </Boton>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <FiltroSegmentado
              etiqueta="Filtrar servicios"
              valor={filtro}
              onCambiar={setFiltro}
              opciones={[
                { valor: 'ACTIVOS', texto: 'Activos', total: servicios.filter((s) => s.activo).length },
                { valor: 'INACTIVOS', texto: 'Inactivos', total: servicios.filter((s) => !s.activo).length },
                { valor: 'TODOS', texto: 'Todos', total: servicios.length },
              ]}
            />
            <CampoBusqueda valor={busqueda} onCambiar={setBusqueda} placeholder="Buscar servicio" />
          </div>
          {filtrados.length === 0 ? (
            <EstadoVacio icono={SearchX} titulo="Sin resultados" descripcion="No hay servicios que coincidan con los filtros." />
          ) : (
            <Tabla
              etiqueta="Catálogo de servicios"
              columnas={columnas}
              filas={filtrados}
              claveFila={(servicio) => servicio.id}
              resumenMovil={celdaServicio}
              destacadoMovil={(servicio) => (
                <Insignia tono={servicio.activo ? 'exito' : 'neutro'}>{servicio.activo ? 'Activo' : 'Inactivo'}</Insignia>
              )}
              acciones={(servicio) => (
                <>
                  <Boton variante="fantasma" tamano="sm" icono={<Pencil className="h-4 w-4" />} onClick={() => abrirEditar(servicio)}>
                    Editar
                  </Boton>
                  {servicio.activo ? (
                    <Boton
                      variante="fantasmaPeligro"
                      tamano="sm"
                      icono={<PowerOff className="h-4 w-4" />}
                                            onClick={() => setAAlternar(servicio)}
                    >
                      Desactivar
                    </Boton>
                  ) : (
                    <Boton variante="secundario" tamano="sm" icono={<Power className="h-4 w-4" />} onClick={() => setAAlternar(servicio)}>
                      Activar
                    </Boton>
                  )}
                </>
              )}
            />
          )}
        </>
      )}

      <Modal
        abierto={modalAbierto}
        titulo={servicioEditando ? 'Editar servicio' : 'Nuevo servicio'}
        descripcion={servicioEditando ? 'Los cambios se verán de inmediato en el catálogo.' : 'Completa la información que verán los clientes.'}
        onCerrar={() => setModalAbierto(false)}
        tamano="lg"
        pie={
          <>
            <Boton variante="contorno" onClick={() => setModalAbierto(false)} disabled={guardando}>
              Cancelar
            </Boton>
            <Boton type="submit" form="formulario-servicio" cargando={guardando}>
              {servicioEditando ? 'Guardar cambios' : 'Crear servicio'}
            </Boton>
          </>
        }
      >
        <form id="formulario-servicio" onSubmit={guardar} className="flex flex-col gap-5" noValidate>
          {error && <Alerta tipo="error" mensaje={error} />}
          <CampoTexto
            etiqueta="Nombre del servicio"
            value={datosFormulario.nombre}
            onChange={(evento) => actualizar('nombre', evento.target.value)}
            error={errores.nombre}
            placeholder="Ej.: Limpieza general del hogar"
            required
          />
          <CampoTextarea
            etiqueta="Descripción"
            value={datosFormulario.descripcion}
            onChange={(evento) => actualizar('descripcion', evento.target.value)}
            error={errores.descripcion}
            placeholder="¿Qué incluye este servicio?"
            required
          />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <CampoTexto
              etiqueta="Precio base (COP)"
              type="number"
              inputMode="numeric"
              min={0}
              value={datosFormulario.precioBase}
              onChange={(evento) => actualizar('precioBase', evento.target.value)}
              error={errores.precioBase}
              ayuda={datosFormulario.precioBase ? formatearPrecio(datosFormulario.precioBase) : undefined}
              required
            />
            <CampoTexto
              etiqueta="Duración (minutos)"
              type="number"
              inputMode="numeric"
              min={15}
              value={datosFormulario.duracionMinutos}
              onChange={(evento) => actualizar('duracionMinutos', evento.target.value)}
              error={errores.duracionMinutos}
              ayuda={datosFormulario.duracionMinutos ? formatearDuracion(Number(datosFormulario.duracionMinutos)) : undefined}
              required
            />
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">Icono</legend>
            <div className="grid grid-cols-6 gap-2">
              {Object.entries(ICONOS_SERVICIO).map(([clave, { Icono, nombre }]) => {
                const seleccionado = datosFormulario.icono === clave;
                return (
                  <button
                    key={clave}
                    type="button"
                    onClick={() => actualizar('icono', clave)}
                    aria-pressed={seleccionado}
                    aria-label={nombre}
                    title={nombre}
                    className={`flex h-11 items-center justify-center rounded-xl border transition-[border-color,background-color,color] duration-150 ${
                      seleccionado ? 'border-marca-500 bg-marca-50 text-marca-600' : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                    }`}
                  >
                    <Icono className="h-5 w-5" aria-hidden />
                  </button>
                );
              })}
            </div>
          </fieldset>
        </form>
      </Modal>

      <DialogoConfirmacion
        abierto={!!aAlternar}
        peligroso={aAlternar?.activo}
        titulo={aAlternar?.activo ? '¿Desactivar este servicio?' : '¿Activar este servicio?'}
        descripcion={
          aAlternar &&
          (aAlternar.activo
            ? `“${aAlternar.nombre}” dejará de aparecer en el catálogo de los clientes. Podrás activarlo de nuevo cuando quieras.`
            : `“${aAlternar.nombre}” volverá a estar disponible en el catálogo.`)
        }
        textoConfirmar={aAlternar?.activo ? 'Desactivar' : 'Activar'}
        procesando={alternando}
        onConfirmar={alternarActivo}
        onCancelar={() => setAAlternar(null)}
      />
    </div>
  );
}
