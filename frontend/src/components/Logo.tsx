interface PropiedadesLogo {
  /** "claro" para fondos blancos, "oscuro" para fondos de marca. */
  tema?: 'claro' | 'oscuro';
  soloIcono?: boolean;
  className?: string;
}

/** Isotipo de ServiClean: una gota limpia con un destello, sobre el azul de marca. */
export function IconoMarca({ className = 'h-8 w-8', tema = 'claro' }: { className?: string; tema?: 'claro' | 'oscuro' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="9" className={tema === 'claro' ? 'fill-marca-600' : 'fill-white/10'} />
      <path d="M15 6.5c0 0-6.5 7.6-6.5 12.4a6.5 6.5 0 0 0 13 0C21.5 14.1 15 6.5 15 6.5Z" className="fill-white" />
      <path
        d="M11.9 19.4a3.2 3.2 0 0 0 3 3"
        fill="none"
        strokeWidth="1.6"
        strokeLinecap="round"
        className="stroke-marca-300"
      />
      <path
        d="M24.2 5.2l.75 2.05 2.05.75-2.05.75-.75 2.05-.75-2.05-2.05-.75 2.05-.75Z"
        className="fill-fresco-300"
      />
    </svg>
  );
}

export default function Logo({ tema = 'claro', soloIcono = false, className = '' }: PropiedadesLogo) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <IconoMarca tema={tema} />
      {!soloIcono && (
        <span
          className={`font-display text-[19px] font-bold tracking-tight ${tema === 'claro' ? 'text-slate-900' : 'text-white'}`}
        >
          Servi<span className={tema === 'claro' ? 'text-marca-600' : 'text-fresco-300'}>Clean</span>
        </span>
      )}
    </span>
  );
}
