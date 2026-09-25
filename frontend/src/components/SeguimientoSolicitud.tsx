import { Check, X } from 'lucide-react';
import { EstadoSolicitud } from '@/tipos';
import { ESTADOS_SOLICITUD } from '@/utilidades/estados';

const FLUJO: EstadoSolicitud[] = ['PENDIENTE', 'ASIGNADO', 'ACEPTADO', 'EN_PROCESO', 'FINALIZADO'];

/** Barra de progreso del ciclo de vida de una solicitud. */
export default function SeguimientoSolicitud({ estado, compacto = false }: { estado: EstadoSolicitud; compacto?: boolean }) {
  if (estado === 'CANCELADO') {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
        <X className="h-4 w-4" aria-hidden />
        Esta solicitud fue cancelada.
      </div>
    );
  }

  const indiceActual = FLUJO.indexOf(estado);

  return (
    <ol className="flex items-start gap-1.5" aria-label={`Estado actual: ${ESTADOS_SOLICITUD[estado].texto}`}>
      {FLUJO.map((paso, indice) => {
        const completado = indice < indiceActual || estado === 'FINALIZADO';
        const actual = indice === indiceActual && estado !== 'FINALIZADO';
        return (
          <li key={paso} className="flex-1" aria-current={actual ? 'step' : undefined}>
            <div
              className={`h-1.5 rounded-full transition-colors duration-300 ${
                completado ? 'bg-fresco-500' : actual ? 'bg-marca-500' : 'bg-slate-200'
              }`}
            />
            {!compacto && (
              <p
                className={`mt-2 flex items-center gap-1 text-[11px] font-medium leading-tight sm:text-xs ${
                  actual ? 'text-marca-700' : completado ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                {completado && <Check className="hidden h-3 w-3 text-fresco-600 sm:block" aria-hidden />}
                {ESTADOS_SOLICITUD[paso].texto}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
