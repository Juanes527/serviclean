'use client';

import { SelectHTMLAttributes, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import Campo, { atributosDescripcion, clasesControl } from './Campo';

interface PropiedadesCampoSelect extends SelectHTMLAttributes<HTMLSelectElement> {
  etiqueta: string;
  error?: string;
  ayuda?: string;
  ocultarEtiqueta?: boolean;
  opciones: { valor: string; texto: string }[];
}

export default function CampoSelect({
  etiqueta,
  error,
  ayuda,
  ocultarEtiqueta,
  opciones,
  id,
  className = '',
  required,
  ...resto
}: PropiedadesCampoSelect) {
  const idGenerado = useId();
  const idCampo = id ?? idGenerado;
  return (
    <Campo
      idCampo={idCampo}
      etiqueta={etiqueta}
      error={error}
      ayuda={ayuda}
      requerido={required}
      ocultarEtiqueta={ocultarEtiqueta}
    >
      <div className="relative">
        <select
          id={idCampo}
          required={required}
          className={clasesControl(!!error, `h-11 cursor-pointer appearance-none pl-3.5 pr-10 ${className}`)}
          {...atributosDescripcion(idCampo, error, ayuda)}
          {...resto}
        >
          {opciones.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.texto}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
      </div>
    </Campo>
  );
}
