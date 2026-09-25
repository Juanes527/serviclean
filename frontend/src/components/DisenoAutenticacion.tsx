import Link from 'next/link';
import { ReactNode } from 'react';
import { CalendarCheck, CircleCheck, ShieldCheck, Star } from 'lucide-react';
import Logo from './Logo';

const BENEFICIOS = [
  { icono: CalendarCheck, texto: 'Agenda servicios en minutos y sigue su estado en tiempo real.' },
  { icono: ShieldCheck, texto: 'Tu sesión y tus datos protegidos en cada paso.' },
  { icono: Star, texto: 'Califica cada servicio y ayúdanos a mantener la calidad.' },
];

interface PropiedadesDisenoAutenticacion {
  titulo: string;
  descripcion?: ReactNode;
  children: ReactNode;
  pie?: ReactNode;
  /** Formularios más amplios, como el registro. */
  ancho?: 'normal' | 'amplio';
}

/** Composición dividida para las páginas de acceso: marca a la izquierda y formulario a la derecha. */
export default function DisenoAutenticacion({ titulo, descripcion, children, pie, ancho = 'normal' }: PropiedadesDisenoAutenticacion) {
  return (
    <div className="flex min-h-dvh bg-white">
      <aside className="relative hidden w-[44%] max-w-[640px] flex-col justify-between overflow-hidden bg-marca-950 p-12 text-white lg:flex xl:p-14">
        <FondoMarca />
        <Link href="/" className="relative w-fit" aria-label="ServiClean, ir a la página principal">
          <Logo tema="oscuro" />
        </Link>

        <div className="relative">
          <h2 className="max-w-md font-display text-[34px] font-bold leading-[1.15] tracking-tight xl:text-[40px]">
            Un hogar limpio
            <br />
            <span className="text-fresco-300">sin complicaciones</span>
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-marca-100/80">
            ServiClean conecta a clientes con personal de aseo y organiza cada servicio de principio a fin.
          </p>

          <ul className="mt-10 flex flex-col gap-4">
            {BENEFICIOS.map(({ icono: Icono, texto }) => (
              <li key={texto} className="flex items-start gap-3.5 text-[15px] text-marca-50/90">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-inset ring-white/10">
                  <Icono className="h-[18px] w-[18px] text-fresco-300" aria-hidden />
                </span>
                <span className="pt-1.5 leading-snug">{texto}</span>
              </li>
            ))}
          </ul>
        </div>

        <TarjetaEjemplo />
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="flex h-16 items-center px-5 sm:px-8 lg:hidden">
          <Link href="/" aria-label="ServiClean, ir a la página principal">
            <Logo />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8 lg:py-12">
          <div className={`w-full animate-aparecer ${ancho === 'amplio' ? 'max-w-lg' : 'max-w-[400px]'}`}>
            <div className="mb-8">
              <h1 className="text-[26px] font-bold leading-tight text-slate-900 sm:text-[30px]">{titulo}</h1>
              {descripcion && <p className="mt-2 text-[15px] leading-relaxed text-slate-500">{descripcion}</p>}
            </div>
            {children}
            {pie && <div className="mt-8 text-center text-sm text-slate-500">{pie}</div>}
          </div>
        </div>
        <p className="px-5 pb-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} ServiClean</p>
      </main>
    </div>
  );
}

/** Fondo sutil: halo de luz y retícula fina que evoca una superficie limpia. */
function FondoMarca() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-marca-500/25 blur-3xl" />
      <div className="absolute -bottom-40 -left-24 h-[380px] w-[380px] rounded-full bg-fresco-500/15 blur-3xl" />
      <svg className="absolute inset-0 h-full w-full opacity-[0.07]">
        <defs>
          <pattern id="reticula-marca" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M32 0H0V32" fill="none" stroke="white" strokeWidth="1" />
          </pattern>
          <linearGradient id="desvanecer-reticula" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="white" stopOpacity="1" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id="mascara-reticula">
            <rect width="100%" height="100%" fill="url(#desvanecer-reticula)" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="url(#reticula-marca)" mask="url(#mascara-reticula)" />
      </svg>
    </div>
  );
}

/** Vista previa del producto: cómo se ve el seguimiento de un servicio. */
function TarjetaEjemplo() {
  return (
    <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm" aria-hidden>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15">
          <CircleCheck className="h-5 w-5 text-emerald-300" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Limpieza general del hogar</p>
          <p className="text-xs text-marca-100/70">Servicio finalizado · Hoy, 11:30 a. m.</p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1.5">
        {['Solicitado', 'Asignado', 'En proceso', 'Finalizado'].map((paso) => (
          <div key={paso} className="flex-1">
            <div className="h-1 rounded-full bg-fresco-300/80" />
            <p className="mt-1.5 text-[10px] text-marca-100/60">{paso}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
