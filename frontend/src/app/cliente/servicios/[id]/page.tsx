'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CalendarDays,
  Check,
  Clock,
  CreditCard,
  Info,
  LucideIcon,
  MapPin,
  Pencil,
  Phone,
  SearchX,
} from 'lucide-react';
import Alerta from '@/components/Alerta';
import { useAvisos } from '@/components/Avisos';
import Boton, { clasesBoton } from '@/components/Boton';
import CampoTexto from '@/components/CampoTexto';
import CampoTextarea from '@/components/CampoTextarea';
import EncabezadoPagina from '@/components/EncabezadoPagina';
import { Esqueleto, EsqueletoEncabezado } from '@/components/Esqueleto';
import EstadoVacio from '@/components/EstadoVacio';
import IconoServicio from '@/components/IconoServicio';
import Pasos from '@/components/Pasos';
import Tarjeta from '@/components/Tarjeta';
import { serviciosServicio } from '@/servicios/servicios.servicio';
import { DatosSolicitud, solicitudesServicio } from '@/servicios/solicitudes.servicio';
import { MetodoPagoVigente, Servicio } from '@/tipos';
import { useAutenticacion } from '@/utilidades/contextoAutenticacion';
import { mensajeError } from '@/utilidades/errores';
import { METODOS_PAGO, TEXTO_METODO_PAGO } from '@/utilidades/estados';
import { fechaISOLocal, formatearDuracion, formatearFecha, formatearHora, formatearPrecio } from '@/utilidades/formato';
import { useCarga } from '@/utilidades/useCarga';

const PASOS = ['Servicio', 'Fecha y hora', 'Información', 'Confirmación'];

const HORAS_SUGERIDAS = ['07:00', '08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

const ICONOS_PAGO: Record<MetodoPagoVigente, LucideIcon> = {
  SIMULADO_TARJETA: CreditCard,
  EFECTIVO: Banknote,
};

const AYUDA_PAGO: Record<MetodoPagoVigente, string> = {
  SIMULADO_TARJETA:
    'Paga en línea con tarjeta de crédito o débito una vez envíes la solicitud, desde «Mis servicios». Tu pago queda registrado con una referencia única.',
  EFECTIVO: 'Paga en efectivo directamente al personal de aseo el día del servicio. Ten el valor exacto a la mano.',
};

const VALOR_INICIAL: Omit<DatosSolicitud, 'servicioId'> = {
  fecha: '',
  hora: '',
  direccion: '',
  telefono: '',
  observaciones: '',
  metodoPago: 'EFECTIVO',
};

type Errores = Partial<Record<keyof typeof VALOR_INICIAL, string>>;

/** Próximos días disponibles para elegir rápidamente la fecha. */
function proximosDias(cantidad: number) {
  return Array.from({ length: cantidad }, (_, indice) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + indice);
    return {
      valor: fechaISOLocal(fecha),
      semana: indice === 0 ? 'Hoy' : indice === 1 ? 'Mañana' : fecha.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', ''),
      dia: fecha.getDate(),
      mes: fecha.toLocaleDateString('es-CO', { month: 'short' }).replace('.', ''),
    };
  });
}

export default function SolicitarServicio() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { usuario } = useAutenticacion();
  const { avisar } = useAvisos();
  const { datos: servicio, cargando, error: errorCarga } = useCarga(() => serviciosServicio.obtenerPorId(id), [id]);
  const [datos, setDatos] = useState(VALOR_INICIAL);
  const [paso, setPaso] = useState(0);
  const [errores, setErrores] = useState<Errores>({});
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const refTitulo = useRef<HTMLHeadingElement>(null);
  const primerRender = useRef(true);
  const dias = useMemo(() => proximosDias(14), []);

  // Evita pedir de nuevo un dato que ya conocemos: el teléfono del perfil.
  useEffect(() => {
    if (usuario?.telefono) setDatos((anterior) => (anterior.telefono ? anterior : { ...anterior, telefono: usuario.telefono }));
  }, [usuario]);

  // Al cambiar de paso, lleva el foco y la vista al inicio del paso.
  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    refTitulo.current?.focus({ preventScroll: true });
  }, [paso]);

  const actualizarCampo = (campo: keyof typeof VALOR_INICIAL, valor: string) => {
    setDatos((anterior) => ({ ...anterior, [campo]: valor }));
    if (errores[campo]) setErrores((anterior) => ({ ...anterior, [campo]: undefined }));
  };

  const validarPaso = (numero: number): boolean => {
    const nuevos: Errores = {};
    if (numero === 1) {
      if (!datos.fecha) nuevos.fecha = 'Selecciona la fecha del servicio.';
      else if (datos.fecha < fechaISOLocal()) nuevos.fecha = 'La fecha no puede estar en el pasado.';
      if (!datos.hora) nuevos.hora = 'Selecciona la hora de inicio.';
    }
    if (numero === 2) {
      if (!datos.direccion.trim()) nuevos.direccion = 'Indica la dirección donde se realizará el servicio.';
      if (!datos.telefono.trim()) nuevos.telefono = 'Indica un teléfono de contacto.';
    }
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const avanzar = (evento?: FormEvent) => {
    evento?.preventDefault();
    setError('');
    if (!validarPaso(paso)) return;
    setPaso((actual) => Math.min(actual + 1, PASOS.length - 1));
  };

  const confirmarSolicitud = async () => {
    if (!servicio) return;
    setEnviando(true);
    setError('');
    try {
      await solicitudesServicio.crear({ servicioId: servicio.id, ...datos });
      avisar({ tipo: 'exito', titulo: 'Solicitud enviada', descripcion: 'Te notificaremos cuando se asigne el personal.' });
      router.push('/cliente/mis-servicios');
    } catch (excepcion) {
      setError(mensajeError(excepcion, 'No fue posible crear la solicitud.'));
      setEnviando(false);
    }
  };

  const volverCatalogo = { href: '/cliente/servicios', texto: 'Catálogo de servicios' };

  if (cargando) {
    return (
      <div className="flex flex-col gap-8" role="status" aria-label="Cargando servicio">
        <EsqueletoEncabezado />
        <Esqueleto className="h-8 w-full max-w-2xl" />
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <Esqueleto className="h-80 rounded-2xl" />
          <Esqueleto className="hidden h-64 rounded-2xl lg:block" />
        </div>
      </div>
    );
  }

  if (errorCarga || !servicio) {
    return (
      <div className="flex flex-col gap-8">
        <EncabezadoPagina titulo="Solicitar servicio" volver={volverCatalogo} />
        <EstadoVacio
          icono={SearchX}
          titulo="No encontramos este servicio"
          descripcion="Es posible que ya no esté disponible. Elige otra opción del catálogo."
          accion={
            <Link href="/cliente/servicios" className={clasesBoton('primario', 'sm')}>
              Ir al catálogo
            </Link>
          }
        />
      </div>
    );
  }

  const tituloPaso: Record<number, { titulo: string; descripcion: string }> = {
    0: { titulo: 'Confirma el servicio', descripcion: 'Revisa en qué consiste antes de agendarlo.' },
    1: { titulo: '¿Cuándo lo necesitas?', descripcion: 'Elige el día y la hora de inicio.' },
    2: { titulo: '¿Dónde y cómo?', descripcion: 'Indica la dirección, un teléfono de contacto y el método de pago.' },
    3: { titulo: 'Revisa y confirma', descripcion: 'Verifica que todo esté correcto antes de enviar la solicitud.' },
  };

  return (
    <div className="flex flex-col gap-8">
      <EncabezadoPagina titulo={`Solicitar ${servicio.nombre.toLowerCase()}`} volver={volverCatalogo} />

      <Pasos pasos={PASOS} actual={paso} />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Tarjeta relleno="lg">
          <div className="mb-6">
            <h2 ref={refTitulo} tabIndex={-1} className="text-xl font-semibold text-slate-900 outline-none">
              {tituloPaso[paso].titulo}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{tituloPaso[paso].descripcion}</p>
          </div>

          {error && <Alerta tipo="error" mensaje={error} className="mb-6" />}

          <div key={paso} className="animate-aparecer">
            {paso === 0 && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-5 rounded-2xl bg-gradient-to-br from-marca-50/70 to-fresco-50/40 p-5 ring-1 ring-inset ring-marca-100 sm:flex-row sm:items-start">
                  <IconoServicio icono={servicio.icono} tamano="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-bold text-slate-900">{servicio.nombre}</p>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{servicio.descripcion}</p>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200/80 p-4">
                    <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <CreditCard className="h-3.5 w-3.5" aria-hidden /> Precio base
                    </dt>
                    <dd className="mt-1 font-display text-xl font-bold text-slate-900 cifras">{formatearPrecio(servicio.precioBase)}</dd>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 p-4">
                    <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <Clock className="h-3.5 w-3.5" aria-hidden /> Duración estimada
                    </dt>
                    <dd className="mt-1 font-display text-xl font-bold text-slate-900">{formatearDuracion(servicio.duracionMinutos)}</dd>
                  </div>
                </dl>
                <Acciones>
                  <Link href="/cliente/servicios" className={clasesBoton('contorno')}>
                    Cambiar servicio
                  </Link>
                  <Boton onClick={() => avanzar()} iconoDerecha={<ArrowRight className="h-4 w-4" />}>
                    Elegir fecha y hora
                  </Boton>
                </Acciones>
              </div>
            )}

            {paso === 1 && (
              <form onSubmit={avanzar} className="flex flex-col gap-7" noValidate>
                <fieldset>
                  <legend className="mb-3 text-sm font-medium text-slate-700">
                    Día del servicio<span className="ml-0.5 text-red-500" aria-hidden>*</span>
                  </legend>
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
                    {dias.map((dia) => {
                      const seleccionado = datos.fecha === dia.valor;
                      return (
                        <button
                          key={dia.valor}
                          type="button"
                          onClick={() => actualizarCampo('fecha', dia.valor)}
                          aria-pressed={seleccionado}
                          aria-label={formatearFecha(`${dia.valor}T00:00:00Z`)}
                          className={`flex w-[68px] shrink-0 flex-col items-center rounded-2xl border py-3 transition-[border-color,background-color,color] duration-150 ${
                            seleccionado
                              ? 'border-marca-600 bg-marca-600 text-white shadow-suave'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-marca-300 hover:bg-marca-50/50'
                          }`}
                        >
                          <span className={`text-[11px] font-medium capitalize ${seleccionado ? 'text-marca-100' : 'text-slate-500'}`}>
                            {dia.semana}
                          </span>
                          <span className="mt-0.5 font-display text-xl font-bold leading-tight">{dia.dia}</span>
                          <span className={`text-[11px] capitalize ${seleccionado ? 'text-marca-100' : 'text-slate-400'}`}>{dia.mes}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 max-w-xs">
                    <CampoTexto
                      etiqueta="O elige otra fecha"
                      type="date"
                      value={datos.fecha}
                      min={fechaISOLocal()}
                      onChange={(evento) => actualizarCampo('fecha', evento.target.value)}
                      error={errores.fecha}
                    />
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="mb-3 text-sm font-medium text-slate-700">
                    Hora de inicio<span className="ml-0.5 text-red-500" aria-hidden>*</span>
                  </legend>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {HORAS_SUGERIDAS.map((hora) => {
                      const seleccionada = datos.hora === hora;
                      return (
                        <button
                          key={hora}
                          type="button"
                          onClick={() => actualizarCampo('hora', hora)}
                          aria-pressed={seleccionada}
                          className={`h-11 rounded-xl border text-sm font-semibold transition-[border-color,background-color,color] duration-150 cifras ${
                            seleccionada
                              ? 'border-marca-600 bg-marca-600 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-marca-300 hover:bg-marca-50/50'
                          }`}
                        >
                          {formatearHora(hora)}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 max-w-xs">
                    <CampoTexto
                      etiqueta="O indica otra hora"
                      type="time"
                      value={datos.hora}
                      onChange={(evento) => actualizarCampo('hora', evento.target.value)}
                      error={errores.hora}
                    />
                  </div>
                </fieldset>

                <Acciones>
                  <Boton variante="contorno" onClick={() => setPaso(0)} icono={<ArrowLeft className="h-4 w-4" />}>
                    Atrás
                  </Boton>
                  <Boton type="submit" iconoDerecha={<ArrowRight className="h-4 w-4" />}>
                    Continuar
                  </Boton>
                </Acciones>
              </form>
            )}

            {paso === 2 && (
              <form onSubmit={avanzar} className="flex flex-col gap-5" noValidate>
                <CampoTexto
                  etiqueta="Dirección del servicio"
                  autoComplete="street-address"
                  placeholder="Ej.: Calle 10 #20-30, apto 501"
                  icono={<MapPin />}
                  value={datos.direccion}
                  onChange={(evento) => actualizarCampo('direccion', evento.target.value)}
                  error={errores.direccion}
                  ayuda="Incluye barrio, torre o apartamento si aplica."
                  required
                />
                <CampoTexto
                  etiqueta="Teléfono de contacto"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  icono={<Phone />}
                  value={datos.telefono}
                  onChange={(evento) => actualizarCampo('telefono', evento.target.value)}
                  error={errores.telefono}
                  ayuda="Lo usará el personal asignado para coordinar la llegada."
                  required
                />
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-slate-700">Método de pago</legend>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {METODOS_PAGO.map((metodo) => {
                      const Icono = ICONOS_PAGO[metodo];
                      const seleccionado = datos.metodoPago === metodo;
                      return (
                        <label
                          key={metodo}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-[border-color,background-color] duration-150 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-marca-100 ${
                            seleccionado ? 'border-marca-500 bg-marca-50/60' : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="metodoPago"
                            value={metodo}
                            checked={seleccionado}
                            onChange={() => actualizarCampo('metodoPago', metodo)}
                            className="sr-only"
                          />
                          <Icono className={`h-5 w-5 shrink-0 ${seleccionado ? 'text-marca-600' : 'text-slate-400'}`} aria-hidden />
                          <span className="flex-1 text-sm font-medium text-slate-800">{TEXTO_METODO_PAGO[metodo]}</span>
                          {seleccionado && <Check className="h-4 w-4 text-marca-600" aria-hidden />}
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[13px] text-slate-500">{AYUDA_PAGO[datos.metodoPago]}</p>
                </fieldset>
                <CampoTextarea
                  etiqueta="Observaciones (opcional)"
                  placeholder="Ej.: hay mascotas, acceso por portería, enfocarse en la cocina…"
                  value={datos.observaciones}
                  onChange={(evento) => actualizarCampo('observaciones', evento.target.value)}
                  ayuda="Cualquier detalle que ayude al personal a prepararse."
                />
                <Acciones>
                  <Boton variante="contorno" onClick={() => setPaso(1)} icono={<ArrowLeft className="h-4 w-4" />}>
                    Atrás
                  </Boton>
                  <Boton type="submit" iconoDerecha={<ArrowRight className="h-4 w-4" />}>
                    Revisar solicitud
                  </Boton>
                </Acciones>
              </form>
            )}

            {paso === 3 && (
              <div className="flex flex-col gap-6">
                <dl className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80">
                  <FilaResumen etiqueta="Servicio" onEditar={() => setPaso(0)}>
                    {servicio.nombre} · {formatearDuracion(servicio.duracionMinutos)}
                  </FilaResumen>
                  <FilaResumen etiqueta="Fecha y hora" onEditar={() => setPaso(1)}>
                    <span className="capitalize-first inline-block">{formatearFecha(`${datos.fecha}T00:00:00Z`)}</span> · {formatearHora(datos.hora)}
                  </FilaResumen>
                  <FilaResumen etiqueta="Dirección" onEditar={() => setPaso(2)}>
                    {datos.direccion}
                  </FilaResumen>
                  <FilaResumen etiqueta="Teléfono" onEditar={() => setPaso(2)}>
                    {datos.telefono}
                  </FilaResumen>
                  <FilaResumen etiqueta="Método de pago" onEditar={() => setPaso(2)}>
                    {TEXTO_METODO_PAGO[datos.metodoPago]}
                  </FilaResumen>
                  {datos.observaciones && (
                    <FilaResumen etiqueta="Observaciones" onEditar={() => setPaso(2)}>
                      <span className="font-normal text-slate-600">{datos.observaciones}</span>
                    </FilaResumen>
                  )}
                </dl>

                <div className="flex items-center justify-between rounded-2xl bg-slate-900 px-5 py-4 text-white">
                  <span className="text-sm text-slate-300">Precio estimado</span>
                  <span className="font-display text-2xl font-bold cifras">{formatearPrecio(servicio.precioBase)}</span>
                </div>

                <p className="flex items-start gap-2 text-sm text-slate-500">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-marca-500" aria-hidden />
                  Al confirmar, tu solicitud quedará pendiente y te notificaremos cuando se asigne el personal de aseo.
                </p>

                <Acciones>
                  <Boton variante="contorno" onClick={() => setPaso(2)} icono={<ArrowLeft className="h-4 w-4" />} disabled={enviando}>
                    Atrás
                  </Boton>
                  <Boton onClick={confirmarSolicitud} cargando={enviando} icono={<Check className="h-4 w-4" />}>
                    {enviando ? 'Enviando…' : 'Confirmar solicitud'}
                  </Boton>
                </Acciones>
              </div>
            )}
          </div>
        </Tarjeta>

        <ResumenLateral servicio={servicio} datos={datos} />
      </div>
    </div>
  );
}

function Acciones({ children }: { children: ReactNode }) {
  return <div className="mt-2 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-between">{children}</div>;
}

function FilaResumen({ etiqueta, children, onEditar }: { etiqueta: string; children: ReactNode; onEditar: () => void }) {
  return (
    <div className="flex items-start gap-4 px-4 py-3.5 sm:px-5">
      <div className="min-w-0 flex-1 sm:flex sm:gap-4">
        <dt className="text-sm text-slate-500 sm:w-36 sm:shrink-0">{etiqueta}</dt>
        <dd className="mt-0.5 text-sm font-medium text-slate-900 texto-largo sm:mt-0">{children}</dd>
      </div>
      <button
        type="button"
        onClick={onEditar}
        className="-my-1 flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-[13px] font-medium text-marca-700 hover:bg-marca-50"
        aria-label={`Editar ${etiqueta.toLowerCase()}`}
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">Editar</span>
      </button>
    </div>
  );
}

/** Resumen persistente de la solicitud en escritorio: se completa a medida que se avanza. */
function ResumenLateral({ servicio, datos }: { servicio: Servicio; datos: typeof VALOR_INICIAL }) {
  const filas: { icono: LucideIcon; etiqueta: string; valor: string }[] = [
    { icono: CalendarDays, etiqueta: 'Fecha', valor: datos.fecha ? formatearFecha(`${datos.fecha}T00:00:00Z`) : '' },
    { icono: Clock, etiqueta: 'Hora', valor: datos.hora ? formatearHora(datos.hora) : '' },
    { icono: MapPin, etiqueta: 'Dirección', valor: datos.direccion },
    { icono: CreditCard, etiqueta: 'Pago', valor: TEXTO_METODO_PAGO[datos.metodoPago] },
  ];
  return (
    <aside className="hidden lg:sticky lg:top-24 lg:block" aria-label="Resumen de la solicitud">
      <Tarjeta relleno="ninguno" className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-100 p-5">
          <IconoServicio icono={servicio.icono} />
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">Tu solicitud</p>
            <p className="truncate font-semibold text-slate-900">{servicio.nombre}</p>
          </div>
        </div>
        <ul className="flex flex-col gap-3.5 p-5">
          {filas.map(({ icono: Icono, etiqueta, valor }) => (
            <li key={etiqueta} className="flex items-start gap-3 text-sm">
              <Icono className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <span className="w-16 shrink-0 text-slate-500">{etiqueta}</span>
              <span className={`min-w-0 flex-1 texto-largo ${valor ? 'font-medium capitalize-first text-slate-800' : 'text-slate-300'}`}>
                {valor || 'Por definir'}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-5 py-4">
          <span className="text-sm text-slate-500">Precio estimado</span>
          <span className="font-display text-lg font-bold text-slate-900 cifras">{formatearPrecio(servicio.precioBase)}</span>
        </div>
      </Tarjeta>
    </aside>
  );
}
