'use client';

import { KeyboardEvent, useId, useState } from 'react';
import { Star } from 'lucide-react';

const TEXTOS_PUNTUACION = ['', 'Deficiente', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'];

/** Visualización de una puntuación (0 a 5) con estrellas. */
export function Estrellas({ valor, tamano = 'sm' }: { valor: number; tamano?: 'sm' | 'md' }) {
  const clase = tamano === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${valor} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((indice) => {
        const relleno = Math.max(0, Math.min(1, valor - indice + 1));
        return (
          <span key={indice} className="relative inline-flex">
            <Star className={`${clase} fill-slate-200 text-slate-200`} aria-hidden />
            {relleno > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${relleno * 100}%` }}>
                <Star className={`${clase} fill-amber-400 text-amber-400`} aria-hidden />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

/** Selector de puntuación accesible (grupo de radio) con vista previa al pasar el cursor. */
export function SelectorEstrellas({ valor, onCambiar }: { valor: number; onCambiar: (valor: number) => void }) {
  const [previa, setPrevia] = useState(0);
  const nombre = useId();
  const mostrado = previa || valor;

  const alPresionarTecla = (evento: KeyboardEvent) => {
    if (evento.key === 'ArrowRight' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      onCambiar(Math.min(5, valor + 1));
    }
    if (evento.key === 'ArrowLeft' || evento.key === 'ArrowDown') {
      evento.preventDefault();
      onCambiar(Math.max(1, valor - 1));
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div role="radiogroup" aria-label="Puntuación del servicio" className="flex gap-1" onMouseLeave={() => setPrevia(0)} onKeyDown={alPresionarTecla}>
        {[1, 2, 3, 4, 5].map((indice) => {
          const activa = indice <= mostrado;
          return (
            <button
              key={indice}
              type="button"
              role="radio"
              name={nombre}
              aria-checked={valor === indice}
              aria-label={`${indice} ${indice === 1 ? 'estrella' : 'estrellas'} · ${TEXTOS_PUNTUACION[indice]}`}
              tabIndex={valor === indice || (valor === 0 && indice === 1) ? 0 : -1}
              onClick={() => onCambiar(indice)}
              onMouseEnter={() => setPrevia(indice)}
              className="flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-150 hover:scale-110 active:scale-95"
            >
              <Star
                className={`h-9 w-9 transition-colors duration-150 ${activa ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-slate-300'}`}
                strokeWidth={1.5}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
      <p className="h-5 text-sm font-semibold text-slate-700" aria-live="polite">
        {TEXTOS_PUNTUACION[mostrado]}
      </p>
    </div>
  );
}
