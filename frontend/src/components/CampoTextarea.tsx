'use client';

import { TextareaHTMLAttributes, useId } from 'react';
import Campo, { atributosDescripcion, clasesControl } from './Campo';

interface PropiedadesCampoTextarea extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  etiqueta: string;
  error?: string;
  ayuda?: string;
}

export default function CampoTextarea({
  etiqueta,
  error,
  ayuda,
  id,
  className = '',
  required,
  rows = 3,
  ...resto
}: PropiedadesCampoTextarea) {
  const idGenerado = useId();
  const idCampo = id ?? idGenerado;
  return (
    <Campo idCampo={idCampo} etiqueta={etiqueta} error={error} ayuda={ayuda} requerido={required}>
      <textarea
        id={idCampo}
        rows={rows}
        required={required}
        className={clasesControl(!!error, `resize-y px-3.5 py-3 leading-relaxed ${className}`)}
        {...atributosDescripcion(idCampo, error, ayuda)}
        {...resto}
      />
    </Campo>
  );
}
