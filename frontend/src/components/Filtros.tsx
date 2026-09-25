'use client';

import { useId } from 'react';
import { Search, X } from 'lucide-react';

export interface OpcionFiltro<V extends string> {
  valor: V;
  texto: string;
  total?: number;
}

/** Filtros por estado en forma de pestañas deslizables; en móvil se desplazan horizontalmente. */
export function FiltroSegmentado<V extends string>({
  opciones,
  valor,
  onCambiar,
  etiqueta,
}: {
  opciones: OpcionFiltro<V>[];
  valor: V;
  onCambiar: (valor: V) => void;
  etiqueta: string;
}) {
  return (
    <div className="-mx-4 min-w-0 max-w-[calc(100%+2rem)] overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:max-w-full sm:px-0 [&::-webkit-scrollbar]:hidden">
      <div role="group" aria-label={etiqueta} className="inline-flex gap-1.5 rounded-xl bg-slate-100/80 p-1">
        {opciones.map((opcion) => {
          const activo = opcion.valor === valor;
          return (
            <button
              key={opcion.valor}
              type="button"
              aria-pressed={activo}
              onClick={() => onCambiar(opcion.valor)}
              className={`inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-150 ${
                activo ? 'bg-white text-slate-900 shadow-suave' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {opcion.texto}
              {opcion.total !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-px text-[11px] font-semibold cifras ${
                    activo ? 'bg-marca-50 text-marca-700' : 'bg-slate-200/70 text-slate-500'
                  }`}
                >
                  {opcion.total}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Campo de búsqueda compacto con botón para limpiar. */
export function CampoBusqueda({
  valor,
  onCambiar,
  placeholder = 'Buscar…',
  etiqueta = 'Buscar',
}: {
  valor: string;
  onCambiar: (valor: string) => void;
  placeholder?: string;
  etiqueta?: string;
}) {
  const id = useId();
  return (
    <div className="relative w-full shrink-0 sm:w-72">
      <label htmlFor={id} className="sr-only">
        {etiqueta}
      </label>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <input
        id={id}
        type="search"
        value={valor}
        onChange={(evento) => onCambiar(evento.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-10 text-[15px] text-slate-900 shadow-suave transition-[border-color,box-shadow] placeholder:text-slate-400 hover:border-slate-400 focus:border-marca-500 focus:outline-none focus:ring-4 focus:ring-marca-100 sm:h-10 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {valor && (
        <button
          type="button"
          onClick={() => onCambiar('')}
          className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Limpiar búsqueda"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
