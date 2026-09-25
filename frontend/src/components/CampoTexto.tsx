'use client';

import { InputHTMLAttributes, ReactNode, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Campo, { atributosDescripcion, clasesControl } from './Campo';

interface PropiedadesCampoTexto extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string;
  error?: string;
  ayuda?: string;
  icono?: ReactNode;
  ocultarEtiqueta?: boolean;
  accionEtiqueta?: ReactNode;
}

export default function CampoTexto({
  etiqueta,
  error,
  ayuda,
  icono,
  ocultarEtiqueta,
  accionEtiqueta,
  id,
  type = 'text',
  className = '',
  required,
  ...resto
}: PropiedadesCampoTexto) {
  const idGenerado = useId();
  const idCampo = id ?? idGenerado;
  const esContrasena = type === 'password';
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  return (
    <Campo
      idCampo={idCampo}
      etiqueta={etiqueta}
      error={error}
      ayuda={ayuda}
      requerido={required}
      ocultarEtiqueta={ocultarEtiqueta}
      accionEtiqueta={accionEtiqueta}
    >
      <div className="relative">
        {icono && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 [&>svg]:h-[18px] [&>svg]:w-[18px]">
            {icono}
          </span>
        )}
        <input
          id={idCampo}
          type={esContrasena && mostrarContrasena ? 'text' : type}
          required={required}
          className={clasesControl(!!error, `h-11 px-3.5 ${icono ? 'pl-11' : ''} ${esContrasena ? 'pr-11' : ''} ${className}`)}
          {...atributosDescripcion(idCampo, error, ayuda)}
          {...resto}
        />
        {esContrasena && (
          <button
            type="button"
            onClick={() => setMostrarContrasena((valor) => !valor)}
            className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={mostrarContrasena}
          >
            {mostrarContrasena ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        )}
      </div>
    </Campo>
  );
}
