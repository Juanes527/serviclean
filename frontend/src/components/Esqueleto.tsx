/** Bloque base con brillo animado para estados de carga. */
export function Esqueleto({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-slate-200/70 before:absolute before:inset-0 before:-translate-x-full before:animate-brillo before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent ${className}`}
      aria-hidden
    />
  );
}

export function EsqueletoEncabezado() {
  return (
    <div className="flex flex-col gap-2.5">
      <Esqueleto className="h-7 w-56" />
      <Esqueleto className="h-4 w-80 max-w-full" />
    </div>
  );
}

export function EsqueletoMetricas({ cantidad = 3 }: { cantidad?: number }) {
  const columnas: Record<number, string> = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-2 xl:grid-cols-4' };
  return (
    <div className={`grid grid-cols-1 gap-4 ${columnas[cantidad] ?? 'sm:grid-cols-3'}`}>
      {Array.from({ length: cantidad }).map((_, indice) => (
        <div key={indice} className="rounded-2xl border border-slate-200/80 bg-white p-5">
          <Esqueleto className="h-9 w-9 rounded-xl" />
          <Esqueleto className="mt-4 h-3.5 w-24" />
          <Esqueleto className="mt-2.5 h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

export function EsqueletoLista({ filas = 4 }: { filas?: number }) {
  return (
    <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
      {Array.from({ length: filas }).map((_, indice) => (
        <div key={indice} className="flex items-center gap-4 px-5 py-4">
          <Esqueleto className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Esqueleto className="h-4 w-2/5" />
            <Esqueleto className="h-3 w-3/5" />
          </div>
          <Esqueleto className="hidden h-6 w-20 rounded-full sm:block" />
        </div>
      ))}
    </div>
  );
}

export function EsqueletoTarjetas({ cantidad = 6 }: { cantidad?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: cantidad }).map((_, indice) => (
        <div key={indice} className="rounded-2xl border border-slate-200/80 bg-white p-6">
          <Esqueleto className="h-12 w-12 rounded-2xl" />
          <Esqueleto className="mt-5 h-5 w-1/2" />
          <Esqueleto className="mt-3 h-3.5 w-full" />
          <Esqueleto className="mt-2 h-3.5 w-4/5" />
          <Esqueleto className="mt-6 h-10 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

/** Esqueleto genérico de una página de listado: encabezado + lista. */
export function EsqueletoPagina({ conMetricas = false }: { conMetricas?: boolean }) {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Cargando contenido">
      <EsqueletoEncabezado />
      {conMetricas && <EsqueletoMetricas />}
      <EsqueletoLista />
    </div>
  );
}
