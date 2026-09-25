import { IconoMarca } from './Logo';

/** Cargador de página completa (verificación de sesión o pantallas sin esqueleto propio). */
export default function Cargando({ texto = 'Cargando…', pantallaCompleta = false }: { texto?: string; pantallaCompleta?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 text-slate-500 ${pantallaCompleta ? 'min-h-dvh bg-fondo' : 'py-20'}`}
      role="status"
      aria-live="polite"
    >
      <div className="relative">
        <span className="absolute -inset-2 animate-ping rounded-2xl bg-marca-200/60 [animation-duration:1.6s]" aria-hidden />
        <IconoMarca className="relative h-10 w-10" />
      </div>
      <p className="text-sm font-medium">{texto}</p>
    </div>
  );
}
