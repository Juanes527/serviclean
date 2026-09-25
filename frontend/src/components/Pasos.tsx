import { Check } from 'lucide-react';

/** Indicador de progreso para flujos guiados de varios pasos. */
export default function Pasos({ pasos, actual }: { pasos: string[]; actual: number }) {
  return (
    <nav aria-label="Progreso de la solicitud">
      <p className="mb-3 text-sm font-medium text-slate-500 sm:hidden">
        Paso {actual + 1} de {pasos.length} · <span className="text-slate-900">{pasos[actual]}</span>
      </p>
      <ol className="flex items-center gap-2 sm:gap-3">
        {pasos.map((paso, indice) => {
          const completado = indice < actual;
          const activo = indice === actual;
          return (
            <li key={paso} className="flex flex-1 items-center gap-2 sm:gap-3" aria-current={activo ? 'step' : undefined}>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-200 ${
                  completado
                    ? 'bg-marca-600 text-white'
                    : activo
                      ? 'bg-white text-marca-700 ring-2 ring-marca-600'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {completado ? <Check className="h-4 w-4" aria-hidden /> : <span aria-hidden>{indice + 1}</span>}
              </span>
              <span
                className={`sr-only whitespace-nowrap text-sm font-medium sm:not-sr-only ${
                  activo ? 'text-slate-900' : completado ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                {paso}
                {completado && <span className="sr-only"> (completado)</span>}
              </span>
              {indice < pasos.length - 1 && (
                <span className="h-0.5 flex-1 overflow-hidden rounded-full bg-slate-200" aria-hidden>
                  <span
                    className="block h-full rounded-full bg-marca-600 transition-transform duration-300"
                    style={{ transform: `scaleX(${completado ? 1 : 0})`, transformOrigin: 'left' }}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
