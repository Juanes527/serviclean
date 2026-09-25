import { ReactNode, useMemo } from 'react';
import { LucideIcon } from 'lucide-react';
import { EstadoSolicitud, Usuario } from '@/tipos';
import { claveFecha, etiquetaDia, fechaISOLocal, formatearHora, marcaServicio, nombreCompleto } from '@/utilidades/formato';
import Avatar from './Avatar';
import EstadoBadge from './EstadoBadge';
import IconoServicio from './IconoServicio';

export interface ElementoAgenda {
  id: string;
  fecha: string;
  hora: string;
  titulo: string;
  icono: string;
  estado: EstadoSolicitud;
  detalles: { icono: LucideIcon; texto: ReactNode }[];
  persona?: { etiqueta: string; usuario?: Pick<Usuario, 'nombre' | 'apellido'> | null };
  acciones?: ReactNode;
}

/** Tira con los próximos 7 días e indicador de servicios por día. */
function SemanaResumen({ conteo }: { conteo: Map<string, number> }) {
  const dias = Array.from({ length: 7 }, (_, indice) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + indice);
    return fecha;
  });
  return (
    <div className="grid grid-cols-7 gap-1.5 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-suave sm:gap-2 sm:p-3">
      {dias.map((fecha, indice) => {
        const clave = fechaISOLocal(fecha);
        const total = conteo.get(clave) ?? 0;
        const contenido = (
          <>
            <span className={`text-[11px] font-medium capitalize ${indice === 0 ? 'text-marca-700' : 'text-slate-500'}`}>
              {indice === 0 ? 'Hoy' : fecha.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '')}
            </span>
            <span className={`mt-0.5 font-display text-lg font-bold leading-none sm:text-xl ${total > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
              {fecha.getDate()}
            </span>
            <span className="mt-1.5 flex h-1.5 gap-0.5" aria-hidden>
              {Array.from({ length: Math.min(total, 3) }).map((_, punto) => (
                <span key={punto} className="h-1.5 w-1.5 rounded-full bg-marca-500" />
              ))}
            </span>
            <span className="sr-only">{total === 0 ? 'Sin servicios' : `${total} ${total === 1 ? 'servicio' : 'servicios'}`}</span>
          </>
        );
        const clases = `flex flex-col items-center rounded-xl py-2 transition-colors ${indice === 0 ? 'bg-marca-50' : ''}`;
        return total > 0 ? (
          <a key={clave} href={`#dia-${clave}`} className={`${clases} hover:bg-slate-100`}>
            {contenido}
          </a>
        ) : (
          <div key={clave} className={clases}>
            {contenido}
          </div>
        );
      })}
    </div>
  );
}

/** Agenda cronológica agrupada por día. */
export default function AgendaLista({ elementos }: { elementos: ElementoAgenda[] }) {
  const grupos = useMemo(() => {
    const ordenados = [...elementos].sort((a, b) => marcaServicio(a.fecha, a.hora) - marcaServicio(b.fecha, b.hora));
    const mapa = new Map<string, ElementoAgenda[]>();
    ordenados.forEach((elemento) => {
      const clave = claveFecha(elemento.fecha);
      mapa.set(clave, [...(mapa.get(clave) ?? []), elemento]);
    });
    return Array.from(mapa.entries());
  }, [elementos]);

  const conteo = useMemo(() => new Map(grupos.map(([clave, lista]) => [clave, lista.length])), [grupos]);
  const hoy = fechaISOLocal();

  return (
    <div className="flex flex-col gap-8">
      <SemanaResumen conteo={conteo} />

      {grupos.map(([clave, lista]) => {
        const pasado = clave < hoy;
        return (
          <section key={clave} id={`dia-${clave}`} className="scroll-mt-24" aria-labelledby={`titulo-dia-${clave}`}>
            <div className="mb-3 flex items-center gap-3">
              <h2 id={`titulo-dia-${clave}`} className={`text-sm font-semibold ${pasado ? 'text-slate-400' : 'text-slate-900'}`}>
                {etiquetaDia(lista[0].fecha)}
              </h2>
              <span className="h-px flex-1 bg-slate-200" aria-hidden />
              <span className="text-xs font-medium text-slate-400">
                {lista.length} {lista.length === 1 ? 'servicio' : 'servicios'}
              </span>
            </div>
            <ol className="flex flex-col gap-3">
              {lista.map((elemento) => (
                <li key={elemento.id} className="flex gap-3 sm:gap-4">
                  <div className="flex w-16 shrink-0 flex-col items-end pt-4 sm:w-20">
                    <span className="text-sm font-semibold text-slate-900 cifras">{formatearHora(elemento.hora)}</span>
                  </div>
                  <div className="relative min-w-0 flex-1 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-suave sm:p-5">
                    <span
                      className={`absolute bottom-4 left-0 top-4 w-1 rounded-r-full ${
                        elemento.estado === 'EN_PROCESO' ? 'bg-fresco-500' : elemento.estado === 'PENDIENTE' ? 'bg-amber-400' : 'bg-marca-500'
                      }`}
                      aria-hidden
                    />
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <IconoServicio icono={elemento.icono} tamano="sm" />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{elemento.titulo}</p>
                          <ul className="mt-1.5 flex flex-col gap-1 text-sm text-slate-500">
                            {elemento.detalles.map(({ icono: Icono, texto }, indice) => (
                              <li key={indice} className="flex min-w-0 items-start gap-2">
                                <Icono className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                                <span className="texto-largo">{texto}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="shrink-0 pl-12 sm:pl-0">
                        <EstadoBadge estado={elemento.estado} />
                      </div>
                    </div>
                    {(elemento.persona || elemento.acciones) && (
                      <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3.5 sm:flex-row sm:items-center sm:justify-between">
                        {elemento.persona && (
                          <div className="flex items-center gap-2.5">
                            {elemento.persona.usuario ? (
                              <>
                                <Avatar usuario={elemento.persona.usuario} tamano="sm" />
                                <div className="text-sm">
                                  <p className="font-medium text-slate-800">{nombreCompleto(elemento.persona.usuario)}</p>
                                  <p className="text-xs text-slate-500">{elemento.persona.etiqueta}</p>
                                </div>
                              </>
                            ) : (
                              <p className="text-sm text-slate-400">{elemento.persona.etiqueta}: por asignar</p>
                            )}
                          </div>
                        )}
                        {elemento.acciones && <div className="flex gap-2">{elemento.acciones}</div>}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
