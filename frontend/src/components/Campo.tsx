import { ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';

/** Clases base compartidas por input, select y textarea. */
export function clasesControl(conError: boolean, extra = ''): string {
  return `block w-full rounded-xl border bg-white text-[15px] text-slate-900 shadow-suave transition-[border-color,box-shadow] duration-150 placeholder:text-slate-400 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 sm:text-sm ${
    conError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
      : 'border-slate-300 hover:border-slate-400 focus:border-marca-500 focus:ring-marca-100'
  } ${extra}`;
}

interface PropiedadesCampo {
  idCampo: string;
  etiqueta: string;
  error?: string;
  ayuda?: string;
  requerido?: boolean;
  ocultarEtiqueta?: boolean;
  accionEtiqueta?: ReactNode;
  children: ReactNode;
}

/** Envoltorio accesible de un campo: etiqueta visible, ayuda persistente y error junto al control. */
export default function Campo({
  idCampo,
  etiqueta,
  error,
  ayuda,
  requerido,
  ocultarEtiqueta,
  accionEtiqueta,
  children,
}: PropiedadesCampo) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`flex items-center justify-between gap-2 ${ocultarEtiqueta ? 'sr-only' : ''}`}>
        <label htmlFor={idCampo} className="text-sm font-medium text-slate-700">
          {etiqueta}
          {requerido && (
            <span className="ml-0.5 text-red-500" aria-hidden>
              *
            </span>
          )}
        </label>
        {accionEtiqueta}
      </div>
      {children}
      {error ? (
        <p id={`${idCampo}-error`} className="flex items-start gap-1.5 text-[13px] font-medium text-red-600" role="alert">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        ayuda && (
          <p id={`${idCampo}-ayuda`} className="text-[13px] text-slate-500">
            {ayuda}
          </p>
        )
      )}
    </div>
  );
}

/** Atributos ARIA que conectan el control con su error o su texto de ayuda. */
export function atributosDescripcion(idCampo: string, error?: string, ayuda?: string) {
  return {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${idCampo}-error` : ayuda ? `${idCampo}-ayuda` : undefined,
  } as const;
}
