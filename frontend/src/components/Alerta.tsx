import { ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';

type TipoAlerta = 'error' | 'exito' | 'info' | 'advertencia';

interface PropiedadesAlerta {
  tipo?: TipoAlerta;
  titulo?: string;
  mensaje: ReactNode;
  accion?: ReactNode;
  onCerrar?: () => void;
  className?: string;
}

const ESTILOS_TIPO: Record<TipoAlerta, { contenedor: string; icono: string }> = {
  error: { contenedor: 'border-red-200 bg-red-50 text-red-800', icono: 'text-red-500' },
  exito: { contenedor: 'border-emerald-200 bg-emerald-50 text-emerald-800', icono: 'text-emerald-600' },
  info: { contenedor: 'border-marca-100 bg-marca-50 text-marca-900', icono: 'text-marca-600' },
  advertencia: { contenedor: 'border-amber-200 bg-amber-50 text-amber-900', icono: 'text-amber-600' },
};

const ICONOS: Record<TipoAlerta, typeof Info> = {
  error: CircleAlert,
  exito: CircleCheck,
  info: Info,
  advertencia: TriangleAlert,
};

export default function Alerta({ tipo = 'info', titulo, mensaje, accion, onCerrar, className = '' }: PropiedadesAlerta) {
  const Icono = ICONOS[tipo];
  return (
    <div
      className={`flex animate-aparecer items-start gap-3 rounded-xl border px-4 py-3 text-sm ${ESTILOS_TIPO[tipo].contenedor} ${className}`}
      role={tipo === 'error' ? 'alert' : 'status'}
    >
      <Icono className={`mt-0.5 h-[18px] w-[18px] shrink-0 ${ESTILOS_TIPO[tipo].icono}`} aria-hidden />
      <div className="min-w-0 flex-1 leading-relaxed">
        {titulo && <p className="font-semibold">{titulo}</p>}
        <div className={titulo ? 'opacity-90' : ''}>{mensaje}</div>
        {accion && <div className="mt-2">{accion}</div>}
      </div>
      {onCerrar && (
        <button
          type="button"
          onClick={onCerrar}
          className="-m-1 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100"
          aria-label="Cerrar aviso"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
