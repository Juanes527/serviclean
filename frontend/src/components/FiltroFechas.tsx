'use client';

import { X } from 'lucide-react';
import CampoTexto from './CampoTexto';

/** Rango de fechas compacto (desde / hasta) para filtros financieros. */
export default function FiltroFechas({
  desde,
  hasta,
  onCambiar,
}: {
  desde: string;
  hasta: string;
  onCambiar: (rango: { desde: string; hasta: string }) => void;
}) {
  return (
    <div className="flex items-end gap-2">
      <div className="w-full sm:w-40">
        <CampoTexto etiqueta="Desde" type="date" value={desde} max={hasta || undefined} onChange={(e) => onCambiar({ desde: e.target.value, hasta })} />
      </div>
      <div className="w-full sm:w-40">
        <CampoTexto etiqueta="Hasta" type="date" value={hasta} min={desde || undefined} onChange={(e) => onCambiar({ desde, hasta: e.target.value })} />
      </div>
      {(desde || hasta) && (
        <button
          type="button"
          onClick={() => onCambiar({ desde: '', hasta: '' })}
          className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Limpiar fechas"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
