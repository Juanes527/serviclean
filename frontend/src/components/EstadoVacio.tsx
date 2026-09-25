import { ReactNode } from 'react';
import { CloudOff, Inbox, LucideIcon, RefreshCw } from 'lucide-react';
import Boton from './Boton';

interface PropiedadesEstadoVacio {
  titulo: string;
  descripcion?: ReactNode;
  icono?: LucideIcon;
  accion?: ReactNode;
  /** "compacto" para usarse dentro de tarjetas o secciones pequeñas. */
  compacto?: boolean;
  className?: string;
}

/** Estado vacío con mensaje útil y, cuando aplica, la siguiente acción sugerida. */
export default function EstadoVacio({ titulo, descripcion, icono: Icono = Inbox, accion, compacto = false, className = '' }: PropiedadesEstadoVacio) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compacto ? 'px-4 py-8' : 'rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14'
      } ${className}`}
    >
      <div className="relative">
        <span className="absolute inset-0 -m-2 rounded-full bg-marca-50" aria-hidden />
        <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-marca-600 shadow-suave ring-1 ring-slate-200/80">
          <Icono className="h-6 w-6" aria-hidden />
        </span>
      </div>
      <h3 className={`mt-5 font-semibold text-slate-900 ${compacto ? 'text-sm' : 'text-base'}`}>{titulo}</h3>
      {descripcion && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500">{descripcion}</p>}
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  );
}

/** Estado de error con opción de reintentar. */
export function EstadoError({ mensaje, onReintentar, compacto }: { mensaje: string; onReintentar?: () => void; compacto?: boolean }) {
  return (
    <EstadoVacio
      icono={CloudOff}
      titulo="No pudimos cargar esta información"
      descripcion={mensaje}
      compacto={compacto}
      accion={
        onReintentar && (
          <Boton variante="contorno" tamano="sm" icono={<RefreshCw className="h-4 w-4" />} onClick={onReintentar}>
            Reintentar
          </Boton>
        )
      }
    />
  );
}
