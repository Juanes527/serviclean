import Link from 'next/link';
import {
  ArrowRight,
  BellRing,
  CalendarCheck,
  CalendarClock,
  Check,
  CircleCheck,
  ClipboardCheck,
  MapPin,
  Sparkles,
  Star,
  UserRoundCheck,
  Wallet,
} from 'lucide-react';
import { clasesBoton } from '@/components/Boton';
import Logo from '@/components/Logo';

const PASOS = [
  { icono: Sparkles, titulo: 'Elige el servicio', descripcion: 'Explora el catálogo con precios base y duración estimada.' },
  { icono: CalendarCheck, titulo: 'Agenda fecha y hora', descripcion: 'Indica cuándo y dónde lo necesitas, y cómo prefieres pagar.' },
  { icono: ClipboardCheck, titulo: 'Sigue cada etapa', descripcion: 'Recibe notificaciones desde la asignación hasta la finalización.' },
];

const CARACTERISTICAS = [
  { icono: UserRoundCheck, titulo: 'Asignación organizada', descripcion: 'Cada solicitud se asigna a personal de aseo que confirma el servicio.' },
  { icono: BellRing, titulo: 'Notificaciones claras', descripcion: 'Entérate de cada cambio de estado sin tener que preguntar.' },
  { icono: Wallet, titulo: 'Pagos registrados', descripcion: 'Efectivo, Nequi o transferencia, con el estado de cada pago a la vista.' },
  { icono: Star, titulo: 'Calidad calificada', descripcion: 'Califica cada servicio finalizado y ayuda a mejorar la atención.' },
];

const PARA_PERSONAL = [
  'Recibe y acepta los servicios que te asignan',
  'Registra tu disponibilidad por fecha y horario',
  'Consulta tu agenda y tu calificación promedio',
];

export default function PaginaInicio() {
  return (
    <div className="min-h-dvh bg-white">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
          <Link href="/" aria-label="ServiClean, inicio">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Acceso">
            <Link href="/iniciar-sesion" className={clasesBoton('fantasma', 'sm', 'sm:h-10 sm:px-4')}>
              Iniciar sesión
            </Link>
            <Link href="/registro" className={clasesBoton('primario', 'sm', 'sm:h-10 sm:px-4')}>
              Crear cuenta
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
            <div className="absolute -top-40 right-[-10%] h-[520px] w-[520px] rounded-full bg-marca-100/70 blur-3xl" />
            <div className="absolute left-[-10%] top-40 h-[380px] w-[380px] rounded-full bg-fresco-100/60 blur-3xl" />
          </div>
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-28 lg:pt-24">
            <div className="animate-aparecer">
              <span className="inline-flex items-center gap-2 rounded-full border border-marca-100 bg-white/80 px-3.5 py-1.5 text-[13px] font-semibold text-marca-700 shadow-suave">
                <Sparkles className="h-3.5 w-3.5 text-fresco-500" aria-hidden />
                Limpieza doméstica, organizada digitalmente
              </span>
              <h1 className="mt-6 text-[40px] font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-[58px]">
                Tu hogar limpio
                <br />
                <span className="text-marca-600">sin complicaciones</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
                Solicita servicios de limpieza en minutos, sigue su estado en tiempo real y califica la atención recibida. Todo en un solo lugar.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/registro" className={clasesBoton('primario', 'lg')}>
                  Solicitar un servicio
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link href="/iniciar-sesion" className={clasesBoton('contorno', 'lg')}>
                  Ya tengo una cuenta
                </Link>
              </div>
              <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                {['Precios base transparentes', 'Seguimiento de cada estado', 'Varios métodos de pago'].map((texto) => (
                  <li key={texto} className="flex items-center gap-2">
                    <CircleCheck className="h-4 w-4 text-fresco-600" aria-hidden />
                    {texto}
                  </li>
                ))}
              </ul>
            </div>

            <VistaPreviaProducto />
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="border-y border-slate-100 bg-fondo py-20 lg:py-24" aria-labelledby="como-funciona">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-fresco-700">Cómo funciona</p>
              <h2 id="como-funciona" className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
                Tres pasos para un hogar impecable
              </h2>
            </div>
            <ol className="mt-12 grid gap-6 md:grid-cols-3">
              {PASOS.map(({ icono: Icono, titulo, descripcion }, indice) => (
                <li key={titulo} className="relative rounded-2xl border border-slate-200/80 bg-white p-7 shadow-suave">
                  <span className="font-display text-sm font-bold text-slate-300">0{indice + 1}</span>
                  <span className="mt-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-marca-50 text-marca-600">
                    <Icono className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-slate-900">{titulo}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-slate-500">{descripcion}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Características */}
        <section className="py-20 lg:py-24" aria-labelledby="caracteristicas">
          <div className="mx-auto grid max-w-6xl gap-14 px-5 sm:px-6 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-fresco-700">Por qué ServiClean</p>
              <h2 id="caracteristicas" className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
                Confianza y orden en cada servicio
              </h2>
              <p className="mt-4 text-[17px] leading-relaxed text-slate-500">
                Clientes, personal de aseo y administradores trabajan sobre la misma información, siempre actualizada.
              </p>
            </div>
            <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
              {CARACTERISTICAS.map(({ icono: Icono, titulo, descripcion }) => (
                <div key={titulo}>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-fresco-50 text-fresco-700 ring-1 ring-inset ring-fresco-100">
                    <Icono className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">{titulo}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-slate-500">{descripcion}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Personal de aseo */}
        <section className="px-5 pb-20 sm:px-6 lg:pb-24">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-marca-950 px-7 py-12 text-white sm:px-12 lg:px-16 lg:py-16">
            <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-marca-500/30 blur-3xl" aria-hidden />
            <div className="relative grid items-center gap-10 lg:grid-cols-2">
              <div>
                <h2 className="text-3xl font-bold sm:text-4xl">¿Trabajas en servicios de aseo?</h2>
                <p className="mt-4 max-w-md text-[17px] leading-relaxed text-marca-100/80">
                  Únete como personal de aseo y organiza tus servicios, horarios y calificaciones desde tu panel.
                </p>
                <Link href="/registro" className={clasesBoton('claro', 'lg', 'mt-8')}>
                  Registrarme como personal
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
              <ul className="flex flex-col gap-3">
                {PARA_PERSONAL.map((texto) => (
                  <li key={texto} className="flex items-center gap-3 rounded-2xl bg-white/[0.06] px-5 py-4 ring-1 ring-inset ring-white/10">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fresco-400/20">
                      <Check className="h-4 w-4 text-fresco-300" aria-hidden />
                    </span>
                    <span className="text-[15px] text-marca-50">{texto}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row sm:px-6">
          <Logo />
          <p className="text-center text-sm text-slate-500">
            © {new Date().getFullYear()} ServiClean
          </p>
        </div>
      </footer>
    </div>
  );
}

/** Composición ilustrativa del producto: próxima reserva y estado del servicio. */
function VistaPreviaProducto() {
  return (
    <div className="relative mx-auto flex w-full max-w-md flex-col lg:max-w-none" aria-hidden>
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-elevada sm:pb-9">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-500">Tu próximo servicio</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-marca-50 px-2.5 py-1 text-xs font-semibold text-marca-700 ring-1 ring-inset ring-marca-200">
            <span className="h-1.5 w-1.5 rounded-full bg-marca-500" />
            Aceptado
          </span>
        </div>
        <div className="mt-5 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-marca-50 to-fresco-50 text-marca-600 ring-1 ring-inset ring-marca-100">
            <Sparkles className="h-7 w-7" strokeWidth={1.75} />
          </span>
          <div>
            <p className="font-display text-lg font-bold text-slate-900">Limpieza general del hogar</p>
            <p className="text-sm text-slate-500">Duración estimada: 3 h</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <CalendarClock className="h-3.5 w-3.5" /> Fecha
            </p>
            <p className="mt-1 font-semibold text-slate-800">Sáb, 9:00 a. m.</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5" /> Dirección
            </p>
            <p className="mt-1 truncate font-semibold text-slate-800">Cra. 45 #12-30</p>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-fresco-100 text-sm font-semibold text-fresco-800">MR</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">María R.</p>
            <p className="text-xs text-slate-500">Personal asignado</p>
          </div>
          <span className="flex items-center gap-1 text-sm font-semibold text-slate-700">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> 4,9
          </span>
        </div>
      </div>

      <div className="relative -mt-4 ml-6 hidden w-64 animate-aparecer self-start rounded-2xl border border-slate-200/80 bg-white p-4 shadow-elevada [animation-delay:300ms] sm:block lg:-ml-8">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <BellRing className="h-[18px] w-[18px]" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Servicio aceptado</p>
            <p className="mt-0.5 text-xs leading-snug text-slate-500">Tu servicio ya tiene personal confirmado.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
