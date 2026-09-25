'use client';

import { useMemo, useState } from 'react';
import { Bell, BellOff, CalendarCheck, CheckCheck, CircleCheck, LucideIcon, UserRoundCheck, Wallet, XCircle } from 'lucide-react';
import { useAvisos } from '@/components/Avisos';
import Boton from '@/components/Boton';
import { usePanel } from '@/components/DisenoPanel';
import EncabezadoPagina from '@/components/EncabezadoPagina';
import { EsqueletoLista } from '@/components/Esqueleto';
import EstadoVacio, { EstadoError } from '@/components/EstadoVacio';
import { FiltroSegmentado } from '@/components/Filtros';
import { notificacionesServicio } from '@/servicios/notificaciones.servicio';
import { Notificacion } from '@/tipos';
import { mensajeError } from '@/utilidades/errores';
import { formatearFechaHora, formatearRelativo, normalizar } from '@/utilidades/formato';
import { useCarga } from '@/utilidades/useCarga';

/** Icono y tono según el contenido del mensaje, para escanear la lista de un vistazo. */
function apariencia(mensaje: string): { Icono: LucideIcon; clase: string } {
  const texto = normalizar(mensaje);
  if (texto.includes('cancel')) return { Icono: XCircle, clase: 'bg-red-50 text-red-600' };
  if (texto.includes('finaliz')) return { Icono: CircleCheck, clase: 'bg-emerald-50 text-emerald-600' };
  if (texto.includes('pago')) return { Icono: Wallet, clase: 'bg-amber-50 text-amber-600' };
  if (texto.includes('acept') || texto.includes('proceso')) return { Icono: CalendarCheck, clase: 'bg-fresco-50 text-fresco-700' };
  if (texto.includes('asign')) return { Icono: UserRoundCheck, clase: 'bg-marca-50 text-marca-600' };
  return { Icono: Bell, clase: 'bg-slate-100 text-slate-500' };
}

type Filtro = 'TODAS' | 'NO_LEIDAS';

export default function ListaNotificaciones() {
  const { avisar } = useAvisos();
  const { refrescarNoLeidas } = usePanel();
  const { datos, setDatos, cargando, error, recargar } = useCarga(() => notificacionesServicio.listarMias());
  const [filtro, setFiltro] = useState<Filtro>('TODAS');
  const [marcandoTodas, setMarcandoTodas] = useState(false);

  const notificaciones = useMemo(() => datos ?? [], [datos]);
  const noLeidas = notificaciones.filter((notificacion) => !notificacion.leida).length;
  const visibles = filtro === 'TODAS' ? notificaciones : notificaciones.filter((notificacion) => !notificacion.leida);

  const actualizarLocal = (cambio: (lista: Notificacion[]) => Notificacion[]) => setDatos((lista) => (lista ? cambio(lista) : lista));

  const marcarLeida = async (id: string) => {
    actualizarLocal((lista) => lista.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    try {
      await notificacionesServicio.marcarComoLeida(id);
      refrescarNoLeidas();
    } catch (excepcion) {
      avisar({ tipo: 'error', titulo: 'No se pudo actualizar', descripcion: mensajeError(excepcion, 'Inténtalo de nuevo.') });
      recargar(true);
    }
  };

  const marcarTodas = async () => {
    setMarcandoTodas(true);
    try {
      await notificacionesServicio.marcarTodasComoLeidas();
      actualizarLocal((lista) => lista.map((n) => ({ ...n, leida: true })));
      refrescarNoLeidas();
      avisar({ tipo: 'exito', titulo: 'Todo al día', descripcion: 'Marcaste todas las notificaciones como leídas.' });
    } catch (excepcion) {
      avisar({ tipo: 'error', titulo: 'No se pudo actualizar', descripcion: mensajeError(excepcion, 'Inténtalo de nuevo.') });
    } finally {
      setMarcandoTodas(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <EncabezadoPagina
        titulo="Notificaciones"
        descripcion={noLeidas > 0 ? `Tienes ${noLeidas} ${noLeidas === 1 ? 'notificación sin leer' : 'notificaciones sin leer'}.` : 'Estás al día.'}
        acciones={
          noLeidas > 0 && (
            <Boton variante="contorno" tamano="sm" icono={<CheckCheck className="h-4 w-4" />} onClick={marcarTodas} cargando={marcandoTodas}>
              Marcar todas como leídas
            </Boton>
          )
        }
      />

      {cargando ? (
        <EsqueletoLista filas={5} />
      ) : error ? (
        <EstadoError mensaje={error} onReintentar={() => recargar()} />
      ) : notificaciones.length === 0 ? (
        <EstadoVacio icono={BellOff} titulo="No tienes notificaciones" descripcion="Te avisaremos aquí cada vez que cambie el estado de un servicio." />
      ) : (
        <>
          <FiltroSegmentado
            etiqueta="Filtrar notificaciones"
            valor={filtro}
            onCambiar={setFiltro}
            opciones={[
              { valor: 'TODAS', texto: 'Todas', total: notificaciones.length },
              { valor: 'NO_LEIDAS', texto: 'Sin leer', total: noLeidas },
            ]}
          />
          {visibles.length === 0 ? (
            <EstadoVacio icono={CheckCheck} titulo="Todo leído" descripcion="No tienes notificaciones pendientes por leer." />
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-suave">
              {visibles.map((notificacion) => {
                const { Icono, clase } = apariencia(notificacion.mensaje);
                return (
                  <li key={notificacion.id} className={`relative flex gap-3.5 px-4 py-4 transition-colors sm:px-5 ${notificacion.leida ? '' : 'bg-marca-50/40'}`}>
                    {!notificacion.leida && <span className="absolute inset-y-0 left-0 w-[3px] bg-marca-500" aria-hidden />}
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${clase}`}>
                      <Icono className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm leading-relaxed ${notificacion.leida ? 'text-slate-600' : 'font-medium text-slate-900'}`}>
                        <span className="sr-only">{notificacion.leida ? 'Leída: ' : 'Sin leer: '}</span>
                        {notificacion.mensaje}
                      </p>
                      <p className="mt-1 text-xs text-slate-400" title={formatearFechaHora(notificacion.fechaCreacion)}>
                        {formatearRelativo(notificacion.fechaCreacion)}
                      </p>
                    </div>
                    {!notificacion.leida && (
                      <button
                        type="button"
                        onClick={() => marcarLeida(notificacion.id)}
                        className="-my-1 h-9 shrink-0 self-center whitespace-nowrap rounded-lg px-2.5 text-[13px] font-medium text-marca-700 transition-colors hover:bg-marca-100/60"
                      >
                        Marcar leída
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
