'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Banknote, CircleCheck, CreditCard, FlaskConical, HandCoins, LoaderCircle, LockKeyhole } from 'lucide-react';
import Alerta from './Alerta';
import Boton from './Boton';
import CampoTexto from './CampoTexto';
import Modal from './Modal';
import { DatosPago, pagosServicio } from '@/servicios/pagos.servicio';
import { MetodoPagoVigente, Pago, Solicitud } from '@/tipos';
import { mensajeError } from '@/utilidades/errores';
import { METODOS_PAGO } from '@/utilidades/estados';
import { formatearFechaMedia, formatearPrecio } from '@/utilidades/formato';
import {
  DatosTarjeta,
  detectarMarca,
  ErroresTarjeta,
  formatearNumeroTarjeta,
  formatearVencimiento,
  soloDigitos,
  TEXTO_MARCA,
  validarTarjeta,
} from '@/utilidades/tarjeta';

const TARJETA_VACIA: DatosTarjeta = { numero: '', titular: '', vencimiento: '', cvv: '' };
/** Pausa breve para simular el procesamiento; no hay ninguna pasarela real detrás. */
const DEMORA_SIMULACION_MS = 1200;

const OPCIONES: Record<MetodoPagoVigente, { titulo: string; descripcion: string; Icono: typeof CreditCard }> = {
  SIMULADO_TARJETA: { titulo: 'Tarjeta', descripcion: 'Pago simulado en línea', Icono: CreditCard },
  EFECTIVO: { titulo: 'Efectivo', descripcion: 'Pagas al personal de aseo', Icono: Banknote },
};

type Paso = 'formulario' | 'procesando' | 'exito';

interface PropiedadesModalPago {
  solicitud: Solicitud | null;
  onCerrar: () => void;
  onPagado: (pago: Pago) => void;
}

/**
 * Pago de un servicio: tarjeta SIMULADA o efectivo.
 *
 * SEGURIDAD: los datos de la tarjeta viven solo en el estado de este componente. Al enviar se
 * derivan los últimos 4 dígitos y la marca, se borra el formulario y solo eso viaja al backend.
 * No hay integración con bancos ni pasarelas: la simulación siempre aprueba el pago.
 */
export default function ModalPago({ solicitud, onCerrar, onPagado }: PropiedadesModalPago) {
  const [metodo, setMetodo] = useState<MetodoPagoVigente>('SIMULADO_TARJETA');
  const [tarjeta, setTarjeta] = useState<DatosTarjeta>(TARJETA_VACIA);
  const [errores, setErrores] = useState<ErroresTarjeta>({});
  const [error, setError] = useState('');
  const [paso, setPaso] = useState<Paso>('formulario');
  const [pago, setPago] = useState<Pago | null>(null);
  const enviando = useRef(false);

  useEffect(() => {
    if (!solicitud) return;
    setMetodo(METODOS_PAGO.includes(solicitud.metodoPago as MetodoPagoVigente) ? (solicitud.metodoPago as MetodoPagoVigente) : 'SIMULADO_TARJETA');
    setTarjeta(TARJETA_VACIA);
    setErrores({});
    setError('');
    setPaso('formulario');
    setPago(null);
    enviando.current = false;
  }, [solicitud]);

  const cerrar = () => {
    if (paso === 'procesando') return;
    setTarjeta(TARJETA_VACIA);
    onCerrar();
  };

  const actualizar = (campo: keyof DatosTarjeta, valor: string) => {
    setTarjeta((anterior) => ({ ...anterior, [campo]: valor }));
    if (errores[campo]) setErrores((anterior) => ({ ...anterior, [campo]: undefined }));
  };

  const pagar = async (evento?: FormEvent) => {
    evento?.preventDefault();
    if (!solicitud || enviando.current) return;

    let datos: DatosPago;
    if (metodo === 'SIMULADO_TARJETA') {
      const encontrados = validarTarjeta(tarjeta);
      setErrores(encontrados);
      if (Object.keys(encontrados).length > 0) return;
      const digitos = soloDigitos(tarjeta.numero);
      datos = { solicitudId: solicitud.id, metodo, tarjetaUltimos4: digitos.slice(-4), tarjetaMarca: detectarMarca(digitos) };
      // Los datos sensibles se descartan antes de cualquier petición.
      setTarjeta(TARJETA_VACIA);
    } else {
      datos = { solicitudId: solicitud.id, metodo: 'EFECTIVO' };
    }

    enviando.current = true;
    setError('');
    setPaso('procesando');
    try {
      const [registrado] = await Promise.all([
        pagosServicio.registrar(datos),
        new Promise((resolver) => setTimeout(resolver, metodo === 'SIMULADO_TARJETA' ? DEMORA_SIMULACION_MS : 400)),
      ]);
      setPago(registrado);
      setPaso('exito');
      onPagado(registrado);
    } catch (excepcion) {
      setError(mensajeError(excepcion, 'No fue posible registrar el pago.'));
      setPaso('formulario');
    } finally {
      enviando.current = false;
    }
  };

  if (!solicitud) return null;
  const monto = formatearPrecio(solicitud.servicio.precioBase);
  const marca = detectarMarca(tarjeta.numero);

  if (paso === 'exito' && pago) {
    const esTarjeta = pago.metodo === 'SIMULADO_TARJETA';
    return (
      <Modal
        abierto
        titulo={esTarjeta ? 'Pago exitoso' : 'Pago en efectivo confirmado'}
        onCerrar={cerrar}
        pie={
          <Boton onClick={cerrar} data-autofocus className="sm:min-w-32">
            Listo
          </Boton>
        }
      >
        <div className="flex flex-col items-center gap-5 pb-2 text-center" role="status">
          <span className="flex h-16 w-16 animate-escalar items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60">
            <CircleCheck className="h-9 w-9" aria-hidden />
          </span>
          <div>
            <p className="font-display text-xl font-bold text-slate-900">{esTarjeta ? '✓ Pago exitoso' : '✓ Pago registrado'}</p>
            <p className="mt-1 text-sm text-slate-500">
              {esTarjeta
                ? `Tu pago de ${formatearPrecio(pago.monto)} fue registrado correctamente.`
                : `Pagarás ${formatearPrecio(pago.monto)} en efectivo directamente al personal de aseo.`}
            </p>
          </div>
          <dl className="w-full divide-y divide-slate-100 rounded-2xl border border-slate-200/80 text-left text-sm">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <dt className="text-slate-500">Método</dt>
              <dd className="font-medium text-slate-900">
                {esTarjeta ? `Tarjeta simulada •••• ${pago.tarjetaUltimos4}` : 'Efectivo al personal'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <dt className="text-slate-500">Referencia</dt>
              <dd className="font-mono text-[13px] font-semibold text-slate-900">{pago.referencia}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <dt className="text-slate-500">Valor</dt>
              <dd className="font-semibold text-slate-900 cifras">{formatearPrecio(pago.monto)}</dd>
            </div>
          </dl>
          {esTarjeta && (
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <FlaskConical className="h-3.5 w-3.5" aria-hidden />
              Simulación académica: no se realizó ningún cobro real.
            </p>
          )}
        </div>
      </Modal>
    );
  }

  const procesando = paso === 'procesando';

  return (
    <Modal
      abierto
      titulo="Pagar servicio"
      onCerrar={cerrar}
      tamano="lg"
      pie={
        <>
          <Boton variante="contorno" onClick={cerrar} disabled={procesando}>
            Cancelar
          </Boton>
          <Boton
            type="submit"
            form="formulario-pago"
            cargando={procesando}
            variante={metodo === 'EFECTIVO' ? 'exito' : 'primario'}
            icono={metodo === 'EFECTIVO' ? <HandCoins className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
          >
            {procesando ? 'Procesando…' : metodo === 'EFECTIVO' ? 'Confirmar pago en efectivo' : `Pagar ${monto}`}
          </Boton>
        </>
      }
    >
      <form id="formulario-pago" onSubmit={pagar} noValidate className="flex flex-col gap-5 pb-2" autoComplete="off">
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-700">{solicitud.servicio.nombre}</p>
            <p className="text-xs text-slate-500">{formatearFechaMedia(solicitud.fecha)}</p>
          </div>
          <p className="font-display text-xl font-bold text-slate-900 cifras">{monto}</p>
        </div>

        {error && <Alerta tipo="error" mensaje={error} />}

        <fieldset disabled={procesando}>
          <legend className="mb-2 text-sm font-medium text-slate-700">Método de pago</legend>
          <div className="grid grid-cols-2 gap-2.5">
            {METODOS_PAGO.map((opcion) => {
              const { titulo, descripcion, Icono } = OPCIONES[opcion];
              const seleccionado = metodo === opcion;
              return (
                <label
                  key={opcion}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-[border-color,background-color] duration-150 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-marca-100 ${
                    seleccionado ? 'border-marca-500 bg-marca-50/60' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input type="radio" name="metodo" value={opcion} checked={seleccionado} onChange={() => setMetodo(opcion)} className="sr-only" />
                  <Icono className={`mt-0.5 h-5 w-5 shrink-0 ${seleccionado ? 'text-marca-600' : 'text-slate-400'}`} aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-800">{titulo}</span>
                    <span className="block text-xs text-slate-500">{descripcion}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {procesando ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center" role="status" aria-live="polite">
            <LoaderCircle className="h-8 w-8 animate-spin text-marca-600" aria-hidden />
            <p className="text-sm font-medium text-slate-700">
              {metodo === 'SIMULADO_TARJETA' ? 'Procesando pago simulado…' : 'Registrando pago en efectivo…'}
            </p>
          </div>
        ) : metodo === 'SIMULADO_TARJETA' ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">💳 Pago simulado</p>
              <p className="mt-0.5 text-amber-800">
                Este proyecto utiliza una simulación de pago. No se realizará ningún cobro real y los datos de la tarjeta no se guardan.
              </p>
            </div>

            {/* Vista previa de la tarjeta */}
            <div
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-marca-700 via-marca-800 to-slate-900 p-5 text-white shadow-elevada"
              aria-hidden
            >
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
              <div className="absolute -bottom-16 right-16 h-40 w-40 rounded-full bg-fresco-400/20" />
              <div className="relative flex items-start justify-between">
                <span className="rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider">Simulación</span>
                <span className="text-sm font-bold tracking-wide">{TEXTO_MARCA[marca]}</span>
              </div>
              <p className="relative mt-6 font-mono text-lg tracking-[0.15em] sm:text-xl">
                {formatearNumeroTarjeta(tarjeta.numero) || '•••• •••• •••• ••••'}
              </p>
              <div className="relative mt-4 flex items-end justify-between gap-4 text-xs">
                <div className="min-w-0">
                  <p className="text-white/60">Titular</p>
                  <p className="truncate font-medium uppercase">{tarjeta.titular || 'Nombre del titular'}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-white/60">Vence</p>
                  <p className="font-medium">{tarjeta.vencimiento || 'MM/AA'}</p>
                </div>
              </div>
            </div>

            <CampoTexto
              etiqueta="Número de tarjeta"
              inputMode="numeric"
              autoComplete="off"
              placeholder="4242 4242 4242 4242"
              icono={<CreditCard />}
              value={formatearNumeroTarjeta(tarjeta.numero)}
              onChange={(evento) => actualizar('numero', soloDigitos(evento.target.value).slice(0, 19))}
              error={errores.numero}
              required
            />
            <CampoTexto
              etiqueta="Nombre del titular"
              autoComplete="off"
              placeholder="Como aparece en la tarjeta"
              value={tarjeta.titular}
              onChange={(evento) => actualizar('titular', evento.target.value.slice(0, 60))}
              error={errores.titular}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <CampoTexto
                etiqueta="Vencimiento"
                inputMode="numeric"
                autoComplete="off"
                placeholder="MM/AA"
                value={tarjeta.vencimiento}
                onChange={(evento) => actualizar('vencimiento', formatearVencimiento(evento.target.value))}
                error={errores.vencimiento}
                required
              />
              <CampoTexto
                etiqueta="CVV"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                placeholder={marca === 'AMEX' ? '4 dígitos' : '3 dígitos'}
                value={tarjeta.cvv}
                onChange={(evento) => actualizar('cvv', soloDigitos(evento.target.value).slice(0, 4))}
                error={errores.cvv}
                required
              />
            </div>
            <p className="flex items-start gap-2 text-xs text-slate-500">
              <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              Solo se registran los últimos 4 dígitos para tu historial. El número completo y el CVV nunca se envían ni se almacenan.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-600">Valor del servicio</span>
              <span className="font-display text-lg font-bold text-slate-900 cifras">{monto}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              Pagarás <strong className="font-semibold">{monto}</strong> en efectivo directamente al personal de aseo
              {solicitud.asignacion?.personal ? ` (${solicitud.asignacion.personal.nombre})` : ''} al momento del servicio.
            </p>
            <p className="mt-3 text-sm font-semibold text-slate-900">¿Confirmar pago en efectivo?</p>
          </div>
        )}
      </form>
    </Modal>
  );
}
