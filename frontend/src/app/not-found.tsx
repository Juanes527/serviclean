import Link from 'next/link';
import { ArrowLeft, SearchX } from 'lucide-react';
import { clasesBoton } from '@/components/Boton';
import Logo from '@/components/Logo';

export default function PaginaNoEncontrada() {
  return (
    <div className="flex min-h-dvh flex-col bg-fondo">
      <header className="flex h-16 items-center px-5 sm:px-8">
        <Link href="/" aria-label="ServiClean, inicio">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-5 pb-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-marca-600 shadow-suave ring-1 ring-slate-200/80">
          <SearchX className="h-7 w-7" aria-hidden />
        </span>
        <p className="mt-6 font-display text-sm font-bold uppercase tracking-[0.14em] text-marca-600">Error 404</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">No encontramos esta página</h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-slate-500">
          Es posible que el enlace esté incompleto o que la página ya no exista.
        </p>
        <Link href="/" className={clasesBoton('primario', 'md', 'mt-8')}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Volver al inicio
        </Link>
      </main>
    </div>
  );
}
