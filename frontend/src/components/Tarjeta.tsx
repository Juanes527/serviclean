import { ElementType, ReactNode } from 'react';

interface PropiedadesTarjeta {
  children: ReactNode;
  className?: string;
  /** Espaciado interno. "ninguno" para contenidos que gestionan su propio padding (listas, tablas). */
  relleno?: 'ninguno' | 'sm' | 'md' | 'lg';
  interactiva?: boolean;
  como?: ElementType;
}

const RELLENOS = {
  ninguno: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
};

export default function Tarjeta({ children, className = '', relleno = 'md', interactiva = false, como: Elemento = 'div' }: PropiedadesTarjeta) {
  return (
    <Elemento
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-suave ${RELLENOS[relleno]} ${
        interactiva ? 'transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-elevada' : ''
      } ${className}`}
    >
      {children}
    </Elemento>
  );
}

/** Encabezado estándar de una sección dentro de una tarjeta. */
export function EncabezadoTarjeta({
  titulo,
  descripcion,
  accion,
  className = '',
}: {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
        {descripcion && <p className="mt-0.5 text-sm text-slate-500">{descripcion}</p>}
      </div>
      {accion && <div className="shrink-0">{accion}</div>}
    </div>
  );
}
