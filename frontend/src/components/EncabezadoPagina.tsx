import Link from 'next/link';
import { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

interface PropiedadesEncabezadoPagina {
  titulo: ReactNode;
  descripcion?: ReactNode;
  acciones?: ReactNode;
  /** Enlace para regresar a la pantalla anterior en flujos de más de un nivel. */
  volver?: { href: string; texto: string };
  etiqueta?: ReactNode;
}

export default function EncabezadoPagina({ titulo, descripcion, acciones, volver, etiqueta }: PropiedadesEncabezadoPagina) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {volver && (
          <Link
            href={volver.href}
            className="group mb-3 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-slate-500 transition-colors hover:text-marca-700"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
            {volver.texto}
          </Link>
        )}
        {etiqueta && <div className="mb-2">{etiqueta}</div>}
        <h1 className="text-2xl font-bold text-slate-900 sm:text-[28px] sm:leading-tight">{titulo}</h1>
        {descripcion && <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-slate-500">{descripcion}</p>}
      </div>
      {acciones && <div className="flex shrink-0 flex-wrap items-center gap-2">{acciones}</div>}
    </header>
  );
}
