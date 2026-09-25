'use client';

import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';

type TipoAviso = 'exito' | 'error' | 'info';

interface Aviso {
  id: number;
  tipo: TipoAviso;
  titulo: string;
  descripcion?: string;
}

interface ContextoAvisos {
  avisar: (aviso: Omit<Aviso, 'id'>) => void;
}

const Contexto = createContext<ContextoAvisos | undefined>(undefined);
const DURACION_MS = 4500;

const ICONOS: Record<TipoAviso, { Icono: typeof Info; clase: string }> = {
  exito: { Icono: CircleCheck, clase: 'text-emerald-500' },
  error: { Icono: CircleAlert, clase: 'text-red-500' },
  info: { Icono: Info, clase: 'text-marca-500' },
};

/** Notificaciones temporales (toasts) para confirmar acciones sin interrumpir al usuario. */
export function ProveedorAvisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const contador = useRef(0);

  const cerrar = useCallback((id: number) => {
    setAvisos((actuales) => actuales.filter((aviso) => aviso.id !== id));
  }, []);

  const avisar = useCallback(
    (aviso: Omit<Aviso, 'id'>) => {
      const id = ++contador.current;
      setAvisos((actuales) => [...actuales.slice(-2), { ...aviso, id }]);
      window.setTimeout(() => cerrar(id), DURACION_MS);
    },
    [cerrar],
  );

  return (
    <Contexto.Provider value={{ avisar }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:left-auto lg:right-6 lg:items-end"
        aria-live="polite"
        role="status"
      >
        {avisos.map(({ id, tipo, titulo, descripcion }) => {
          const { Icono, clase } = ICONOS[tipo];
          return (
            <div
              key={id}
              className="pointer-events-auto flex w-full max-w-sm animate-escalar items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-elevada"
            >
              <Icono className={`mt-0.5 h-5 w-5 shrink-0 ${clase}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{titulo}</p>
                {descripcion && <p className="mt-0.5 text-sm text-slate-500">{descripcion}</p>}
              </div>
              <button
                type="button"
                onClick={() => cerrar(id)}
                className="-m-1 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-600"
                aria-label="Cerrar notificación"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </Contexto.Provider>
  );
}

export function useAvisos() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useAvisos debe usarse dentro de ProveedorAvisos.');
  return contexto;
}
