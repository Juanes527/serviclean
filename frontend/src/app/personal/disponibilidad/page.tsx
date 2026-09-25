'use client';

import { FormEvent, useMemo, useState } from 'react';
import { CalendarClock, CalendarPlus, ChevronDown, Clock, Sun, Sunrise, Trash2 } from 'lucide-react';
import Alerta from '@/components/Alerta';
import { useAvisos } from '@/components/Avisos';
import Boton from '@/components/Boton';
import CampoTexto from '@/components/CampoTexto';
import DialogoConfirmacion from '@/components/DialogoConfirmacion';
import EncabezadoPagina from '@/components/EncabezadoPagina';
import BloqueFecha from '@/components/BloqueFecha';
import { EsqueletoLista } from '@/components/Esqueleto';
import EstadoVacio, { EstadoError } from '@/components/EstadoVacio';
import Tarjeta, { EncabezadoTarjeta } from '@/components/Tarjeta';
import { disponibilidadServicio } from '@/servicios/disponibilidad.servicio';
import { Disponibilidad } from '@/tipos';
import { mensajeError } from '@/utilidades/errores';
import { claveFecha, etiquetaDia, fechaISOLocal, formatearHora, marcaServicio } from '@/utilidades/formato';
import { useCarga } from '@/utilidades/useCarga';

const VALOR_INICIAL = { fecha: '', horaInicio: '08:00', horaFin: '17:00' };

const JORNADAS = [
  { texto: 'Mañana', icono: Sunrise, inicio: '08:00', fin: '12:00' },
  { texto: 'Tarde', icono: Sun, inicio: '13:00', fin: '17:00' },
  { texto: 'Completa', icono: Clock, inicio: '08:00', fin: '17:00' },
];

function duracionHoras(inicio: string, fin: string) {
  const [hi, mi] = inicio.split(':').map(Number);
  const [hf, mf] = fin.split(':').map(Number);
  return (hf * 60 + mf - (hi * 60 + mi)) / 60;
}

export default function DisponibilidadPersonal() {
  const { avisar } = useAvisos();
  const { datos, cargando, error: errorCarga, recargar } = useCarga(() => disponibilidadServicio.listarMia());
  const [datosFormulario, setDatosFormulario] = useState(VALOR_INICIAL);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [aEliminar, setAEliminar] = useState<Disponibilidad | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const hoy = fechaISOLocal();

  const { proximas, anteriores } = useMemo(() => {
    const ordenadas = [...(datos ?? [])].sort((a, b) => marcaServicio(a.fecha, a.horaInicio) - marcaServicio(b.fecha, b.horaInicio));
    const agrupar = (lista: Disponibilidad[]) => {
      const mapa = new Map<string, Disponibilidad[]>();
      lista.forEach((franja) => mapa.set(claveFecha(franja.fecha), [...(mapa.get(claveFecha(franja.fecha)) ?? []), franja]));
      return Array.from(mapa.entries());
    };
    return {
      proximas: agrupar(ordenadas.filter((franja) => claveFecha(franja.fecha) >= hoy)),
      anteriores: agrupar(ordenadas.filter((franja) => claveFecha(franja.fecha) < hoy).reverse()),
    };
  }, [datos, hoy]);

  const crear = async (evento: FormEvent) => {
    evento.preventDefault();
    setError('');
    if (!datosFormulario.fecha) {
      setError('Debe seleccionar una fecha.');
      return;
    }
    if (duracionHoras(datosFormulario.horaInicio, datosFormulario.horaFin) <= 0) {
      setError('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }
    setGuardando(true);
    try {
      await disponibilidadServicio.crear(datosFormulario);
      avisar({
        tipo: 'exito',
        titulo: 'Disponibilidad registrada',
        descripcion: `${etiquetaDia(`${datosFormulario.fecha}T00:00:00Z`)}, ${formatearHora(datosFormulario.horaInicio)} – ${formatearHora(datosFormulario.horaFin)}`,
      });
      setDatosFormulario({ ...VALOR_INICIAL });
      await recargar(true);
    } catch (excepcion) {
      setError(mensajeError(excepcion, 'No fue posible registrar la disponibilidad.'));
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      await disponibilidadServicio.eliminar(aEliminar.id);
      avisar({ tipo: 'exito', titulo: 'Franja eliminada' });
      setAEliminar(null);
      await recargar(true);
    } catch (excepcion) {
      avisar({ tipo: 'error', titulo: 'No se pudo eliminar', descripcion: mensajeError(excepcion, 'Inténtalo de nuevo.') });
    } finally {
      setEliminando(false);
    }
  };

  const horas = duracionHoras(datosFormulario.horaInicio, datosFormulario.horaFin);

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Mi disponibilidad"
        descripcion="Registra los días y horarios en los que puedes atender servicios. Así el administrador podrá asignarte trabajos."
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <Tarjeta className="lg:sticky lg:top-24">
          <EncabezadoTarjeta titulo="Agregar franja" descripcion="Elige un día y un rango de horas." className="mb-5" />
          {error && <Alerta tipo="error" mensaje={error} className="mb-5" />}
          <form onSubmit={crear} className="flex flex-col gap-5">
            <CampoTexto
              etiqueta="Fecha"
              type="date"
              value={datosFormulario.fecha}
              onChange={(evento) => setDatosFormulario({ ...datosFormulario, fecha: evento.target.value })}
              min={hoy}
              required
            />
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-slate-700">Jornada</legend>
              <div className="grid grid-cols-3 gap-2">
                {JORNADAS.map(({ texto, icono: Icono, inicio, fin }) => {
                  const activa = datosFormulario.horaInicio === inicio && datosFormulario.horaFin === fin;
                  return (
                    <button
                      key={texto}
                      type="button"
                      aria-pressed={activa}
                      onClick={() => setDatosFormulario({ ...datosFormulario, horaInicio: inicio, horaFin: fin })}
                      className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 text-[13px] font-medium transition-[border-color,background-color,color] duration-150 ${
                        activa ? 'border-marca-500 bg-marca-50 text-marca-700' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <Icono className="h-4 w-4" aria-hidden />
                      {texto}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <CampoTexto
                etiqueta="Desde"
                type="time"
                value={datosFormulario.horaInicio}
                onChange={(evento) => setDatosFormulario({ ...datosFormulario, horaInicio: evento.target.value })}
                required
              />
              <CampoTexto
                etiqueta="Hasta"
                type="time"
                value={datosFormulario.horaFin}
                onChange={(evento) => setDatosFormulario({ ...datosFormulario, horaFin: evento.target.value })}
                required
              />
            </div>
            <p className={`text-[13px] ${horas > 0 ? 'text-slate-500' : 'text-red-600'}`}>
              {horas > 0 ? `Franja de ${horas % 1 === 0 ? horas : horas.toFixed(1)} ${horas === 1 ? 'hora' : 'horas'}.` : 'La hora de fin debe ser posterior al inicio.'}
            </p>
            <Boton type="submit" cargando={guardando} icono={<CalendarPlus className="h-4 w-4" />} className="w-full">
              Agregar disponibilidad
            </Boton>
          </form>
        </Tarjeta>

        <section aria-labelledby="titulo-franjas" className="flex flex-col gap-4">
          <h2 id="titulo-franjas" className="text-lg font-semibold text-slate-900">
            Próximas franjas
          </h2>
          {cargando ? (
            <EsqueletoLista filas={3} />
          ) : errorCarga ? (
            <EstadoError mensaje={errorCarga} onReintentar={() => recargar()} />
          ) : proximas.length === 0 ? (
            <EstadoVacio
              icono={CalendarClock}
              titulo="Sin disponibilidad registrada"
              descripcion="Agrega tu primera franja para empezar a recibir servicios."
            />
          ) : (
            <ListaFranjas grupos={proximas} onEliminar={setAEliminar} />
          )}

          {anteriores.length > 0 && (
            <details className="group mt-2">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg py-2 text-sm font-medium text-slate-500 hover:text-slate-700">
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
                Franjas anteriores ({anteriores.reduce((total, [, lista]) => total + lista.length, 0)})
              </summary>
              <div className="mt-2 opacity-70">
                <ListaFranjas grupos={anteriores} />
              </div>
            </details>
          )}
        </section>
      </div>

      <DialogoConfirmacion
        abierto={!!aEliminar}
        peligroso
        titulo="¿Eliminar esta franja?"
        descripcion={
          aEliminar &&
          `${etiquetaDia(aEliminar.fecha)}, de ${formatearHora(aEliminar.horaInicio)} a ${formatearHora(aEliminar.horaFin)}. Dejarás de estar disponible en ese horario.`
        }
        textoConfirmar="Eliminar"
        procesando={eliminando}
        onConfirmar={eliminar}
        onCancelar={() => setAEliminar(null)}
      />
    </div>
  );
}

function ListaFranjas({ grupos, onEliminar }: { grupos: [string, Disponibilidad[]][]; onEliminar?: (franja: Disponibilidad) => void }) {
  return (
    <ul className="flex flex-col gap-3">
      {grupos.map(([clave, franjas]) => {
        return (
          <li key={clave} className="flex gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-suave">
            <BloqueFecha fecha={franjas[0].fecha} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{etiquetaDia(franjas[0].fecha)}</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {franjas.map((franja) => (
                  <li
                    key={franja.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-fresco-50 py-1 pl-3 pr-1 text-sm font-medium text-fresco-800 ring-1 ring-inset ring-fresco-200/70 cifras"
                  >
                    {formatearHora(franja.horaInicio)} – {formatearHora(franja.horaFin)}
                    {onEliminar ? (
                      <button
                        type="button"
                        onClick={() => onEliminar(franja)}
                        className="ml-1 flex h-7 w-7 items-center justify-center rounded-md text-fresco-700/70 transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label={`Eliminar franja de ${formatearHora(franja.horaInicio)} a ${formatearHora(franja.horaFin)}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <span className="w-2" />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
