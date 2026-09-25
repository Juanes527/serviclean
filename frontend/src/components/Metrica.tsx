import Link from 'next/link';
import { ReactNode } from 'react';
import { ArrowUpRight, LucideIcon } from 'lucide-react';
import { CLASES_TONO, Tono } from '@/utilidades/estados';

interface PropiedadesMetrica {
  etiqueta: string;
  valor: ReactNode;
  icono: LucideIcon;
  tono?: Tono;
  /** Contexto que da sentido a la cifra (comparación, desglose o siguiente paso). */
  contexto?: ReactNode;
  href?: string;
}

/** Tarjeta de indicador: icono, cifra principal y contexto. */
export default function Metrica({ etiqueta, valor, icono: Icono, tono = 'marca', contexto, href }: PropiedadesMetrica) {
  const contenido = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${CLASES_TONO[tono].suave}`}>
          <Icono className="h-5 w-5" aria-hidden />
        </span>
        {href && (
          <ArrowUpRight
            className="h-4 w-4 text-slate-300 transition-[color,transform] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-marca-600"
            aria-hidden
          />
        )}
      </div>
      <p className="mt-4 text-sm font-medium text-slate-500">{etiqueta}</p>
      <p className="mt-1 font-display text-[28px] font-bold leading-none tracking-tight text-slate-900 cifras">{valor}</p>
      {contexto && <div className="mt-2.5 text-[13px] leading-snug text-slate-500">{contexto}</div>}
    </>
  );

  const clases = 'group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-suave';

  if (href) {
    return (
      <Link href={href} className={`${clases} block transition-[border-color,box-shadow] duration-200 hover:border-marca-200 hover:shadow-elevada`}>
        {contenido}
      </Link>
    );
  }
  return <div className={clases}>{contenido}</div>;
}
