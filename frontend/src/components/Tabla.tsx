import { ReactNode } from 'react';

export interface ColumnaTabla<T> {
  clave: string;
  titulo: string;
  render: (fila: T) => ReactNode;
  /** Alineación de la celda. Las cifras se alinean a la derecha. */
  alineacion?: 'izquierda' | 'derecha';
  /** Oculta la columna en la vista de tarjetas móvil (dato secundario). */
  ocultarEnMovil?: boolean;
  className?: string;
}

interface PropiedadesTabla<T> {
  columnas: ColumnaTabla<T>[];
  filas: T[];
  claveFila: (fila: T) => string;
  /** Contenido principal de cada tarjeta en móvil (título + subtítulo). */
  resumenMovil: (fila: T) => ReactNode;
  /** Insignia o dato destacado en la esquina de la tarjeta móvil. */
  destacadoMovil?: (fila: T) => ReactNode;
  acciones?: (fila: T) => ReactNode;
  onSeleccionar?: (fila: T) => void;
  etiqueta: string;
}

/**
 * Tabla de datos responsiva: tabla clásica desde `xl` y lista de tarjetas en móvil,
 * para evitar desplazamiento horizontal en pantallas pequeñas.
 */
export default function Tabla<T>({
  columnas,
  filas,
  claveFila,
  resumenMovil,
  destacadoMovil,
  acciones,
  onSeleccionar,
  etiqueta,
}: PropiedadesTabla<T>) {
  const columnasMovil = columnas.filter((columna) => !columna.ocultarEnMovil);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-suave">
      {/* Escritorio */}
      <div className="hidden overflow-x-auto xl:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{etiqueta}</caption>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              {columnas.map((columna) => (
                <th
                  key={columna.clave}
                  scope="col"
                  className={`whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${
                    columna.alineacion === 'derecha' ? 'text-right' : ''
                  }`}
                >
                  {columna.titulo}
                </th>
              ))}
              {acciones && (
                <th scope="col" className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span className="sr-only">Acciones</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filas.map((fila) => (
              <tr
                key={claveFila(fila)}
                onClick={onSeleccionar ? () => onSeleccionar(fila) : undefined}
                className={`transition-colors hover:bg-marca-50/40 ${onSeleccionar ? 'cursor-pointer' : ''}`}
              >
                {columnas.map((columna) => (
                  <td
                    key={columna.clave}
                    className={`whitespace-nowrap px-5 py-3.5 align-middle text-slate-600 ${columna.alineacion === 'derecha' ? 'text-right cifras' : ''} ${
                      columna.className ?? ''
                    }`}
                  >
                    {columna.render(fila)}
                  </td>
                ))}
                {acciones && (
                  <td className="px-5 py-3.5 text-right" onClick={(evento) => evento.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">{acciones(fila)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Móvil y tableta */}
      <ul className="divide-y divide-slate-100 xl:hidden" aria-label={etiqueta}>
        {filas.map((fila) => (
          <li key={claveFila(fila)} className="px-4 py-4">
            <div
              className={`flex items-start justify-between gap-3 ${onSeleccionar ? 'cursor-pointer' : ''}`}
              onClick={onSeleccionar ? () => onSeleccionar(fila) : undefined}
            >
              <div className="min-w-0 flex-1">{resumenMovil(fila)}</div>
              {destacadoMovil && <div className="shrink-0">{destacadoMovil(fila)}</div>}
            </div>
            {columnasMovil.length > 0 && (
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-3 lg:grid-cols-4">
                {columnasMovil.map((columna) => (
                  <div key={columna.clave} className="min-w-0">
                    <dt className="text-xs text-slate-500">{columna.titulo}</dt>
                    <dd className="mt-0.5 text-slate-700 texto-largo">{columna.render(fila)}</dd>
                  </div>
                ))}
              </dl>
            )}
            {acciones && <div className="mt-3.5 flex flex-wrap gap-2 empty:hidden [&>*]:flex-1 sm:justify-end sm:[&>*]:flex-none">{acciones(fila)}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Celda con título y subtítulo, para la primera columna de las tablas. */
export function CeldaPrincipal({ titulo, subtitulo, icono }: { titulo: ReactNode; subtitulo?: ReactNode; icono?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {icono}
      <div className="min-w-0 max-w-[18rem]">
        <p className="truncate font-medium text-slate-900">{titulo}</p>
        {subtitulo && <p className="text-[13px] text-slate-500 texto-largo">{subtitulo}</p>}
      </div>
    </div>
  );
}
