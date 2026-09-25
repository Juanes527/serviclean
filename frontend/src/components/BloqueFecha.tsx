import { partesFecha } from '@/utilidades/formato';

/** Bloque de calendario compacto con el mes y el día. */
export default function BloqueFecha({ fecha }: { fecha: string }) {
  const { dia, mes } = partesFecha(fecha);
  return (
    <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-marca-50 py-1.5 ring-1 ring-inset ring-marca-100">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-marca-600">{mes}</span>
      <span className="font-display text-lg font-bold leading-tight text-slate-900">{dia}</span>
    </div>
  );
}
