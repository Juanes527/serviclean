import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';

export type VarianteBoton = 'primario' | 'secundario' | 'contorno' | 'fantasma' | 'peligro' | 'exito' | 'claro' | 'fantasmaPeligro';
export type TamanoBoton = 'sm' | 'md' | 'lg';

const ESTILOS_VARIANTE: Record<VarianteBoton, string> = {
  primario: 'bg-marca-600 text-white shadow-suave hover:bg-marca-700 active:bg-marca-800',
  secundario: 'bg-marca-50 text-marca-700 hover:bg-marca-100 active:bg-marca-200',
  contorno: 'border border-slate-300 bg-white text-slate-700 shadow-suave hover:border-slate-400 hover:bg-slate-50',
  fantasma: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  peligro: 'bg-red-600 text-white shadow-suave hover:bg-red-700 active:bg-red-800',
  exito: 'bg-emerald-600 text-white shadow-suave hover:bg-emerald-700 active:bg-emerald-800',
  /** Para usar sobre fondos oscuros de marca. */
  claro: 'bg-white text-marca-800 shadow-suave hover:bg-marca-50 active:bg-marca-100',
  /** Acción destructiva secundaria, sin fondo. */
  fantasmaPeligro: 'text-red-600 hover:bg-red-50 hover:text-red-700',
};

const ESTILOS_TAMANO: Record<TamanoBoton, string> = {
  sm: 'h-9 gap-1.5 rounded-lg px-3 text-[13px]',
  md: 'h-11 gap-2 rounded-xl px-4 text-sm',
  lg: 'h-12 gap-2 rounded-xl px-6 text-[15px]',
};

/** Clases de botón reutilizables también en enlaces (<Link>) que se ven como botones. */
export function clasesBoton(variante: VarianteBoton = 'primario', tamano: TamanoBoton = 'md', extra = ''): string {
  return `inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${ESTILOS_VARIANTE[variante]} ${ESTILOS_TAMANO[tamano]} ${extra}`;
}

interface PropiedadesBoton extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBoton;
  tamano?: TamanoBoton;
  cargando?: boolean;
  icono?: ReactNode;
  iconoDerecha?: ReactNode;
}

const Boton = forwardRef<HTMLButtonElement, PropiedadesBoton>(function Boton(
  {
    variante = 'primario',
    tamano = 'md',
    cargando = false,
    icono,
    iconoDerecha,
    disabled,
    className = '',
    type = 'button',
    children,
    ...resto
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={clasesBoton(variante, tamano, className)}
      {...resto}
    >
      {cargando ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : icono}
      {children}
      {!cargando && iconoDerecha}
    </button>
  );
});

export default Boton;
