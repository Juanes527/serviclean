'use client';

import { ReactNode, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface PropiedadesModal {
  abierto: boolean;
  titulo: string;
  descripcion?: ReactNode;
  onCerrar: () => void;
  children?: ReactNode;
  /** Acciones fijas en la parte inferior del diálogo. */
  pie?: ReactNode;
  tamano?: 'sm' | 'md' | 'lg';
  icono?: ReactNode;
}

const ANCHOS = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-xl' };
const SELECTOR_ENFOCABLES =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Diálogo accesible: se cierra con Escape o clic fuera, atrapa el foco,
 * bloquea el scroll del fondo y en móvil se presenta como hoja inferior.
 */
export default function Modal({ abierto, titulo, descripcion, onCerrar, children, pie, tamano = 'md', icono }: PropiedadesModal) {
  const idTitulo = useId();
  const idDescripcion = useId();
  const refDialogo = useRef<HTMLDivElement>(null);
  const refCerrar = useRef(onCerrar);
  refCerrar.current = onCerrar;
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);

  useEffect(() => {
    if (!abierto) return;
    const elementoPrevio = document.activeElement as HTMLElement | null;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const dialogo = refDialogo.current;
    // Prioridad: elemento marcado, primer campo del formulario y, por último, cualquier control.
    const primero =
      dialogo?.querySelector<HTMLElement>('[data-autofocus]') ??
      dialogo?.querySelector<HTMLElement>('input:not([disabled]):not([type=radio]), select:not([disabled]), textarea:not([disabled])') ??
      dialogo?.querySelector<HTMLElement>(SELECTOR_ENFOCABLES);
    primero?.focus();

    const alPresionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        evento.stopPropagation();
        refCerrar.current();
        return;
      }
      if (evento.key !== 'Tab' || !dialogo) return;
      const enfocables = Array.from(dialogo.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLES));
      if (enfocables.length === 0) return;
      const inicio = enfocables[0];
      const fin = enfocables[enfocables.length - 1];
      if (evento.shiftKey && document.activeElement === inicio) {
        evento.preventDefault();
        fin.focus();
      } else if (!evento.shiftKey && document.activeElement === fin) {
        evento.preventDefault();
        inicio.focus();
      }
    };

    document.addEventListener('keydown', alPresionarTecla);
    return () => {
      document.removeEventListener('keydown', alPresionarTecla);
      document.body.style.overflow = overflowPrevio;
      elementoPrevio?.focus?.();
    };
  }, [abierto]);

  if (!abierto || !montado) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-desvanecer bg-slate-900/40 backdrop-blur-[2px]" onClick={onCerrar} aria-hidden />
      <div
        ref={refDialogo}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={descripcion ? idDescripcion : undefined}
        className={`relative flex max-h-[92dvh] w-full animate-subir flex-col rounded-t-3xl bg-white shadow-flotante sm:animate-escalar sm:rounded-2xl ${ANCHOS[tamano]}`}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden />
        <div className="flex items-start gap-3.5 px-5 pb-2 pt-4 sm:px-6 sm:pt-6">
          {icono && <div className="shrink-0">{icono}</div>}
          <div className="min-w-0 flex-1">
            <h2 id={idTitulo} className="text-lg font-semibold text-slate-900">
              {titulo}
            </h2>
            {descripcion && (
              <div id={idDescripcion} className="mt-1 text-sm leading-relaxed text-slate-500">
                {descripcion}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children && <div className="overflow-y-auto px-5 py-3 sm:px-6">{children}</div>}
        {pie && (
          <div className="mt-2 flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-6">
            {pie}
          </div>
        )}
        {!pie && <div className="h-3 pb-[env(safe-area-inset-bottom)] sm:h-4" />}
      </div>
    </div>,
    document.body,
  );
}
