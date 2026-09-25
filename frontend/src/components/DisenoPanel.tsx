'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Bell, ChevronDown, LogOut, Menu, Plus, UserRound, X } from 'lucide-react';
import { notificacionesServicio } from '@/servicios/notificaciones.servicio';
import { RolUsuario } from '@/tipos';
import { useAutenticacion } from '@/utilidades/contextoAutenticacion';
import { nombreCompleto } from '@/utilidades/formato';
import Avatar from './Avatar';
import { clasesBoton } from './Boton';
import Logo from './Logo';
import { ConfiguracionPanel, EnlaceNavegacion, esEnlaceActivo, NAVEGACION } from './navegacion';

interface ContextoPanel {
  noLeidas: number;
  refrescarNoLeidas: () => void;
}

const Contexto = createContext<ContextoPanel>({ noLeidas: 0, refrescarNoLeidas: () => undefined });

/** Permite a las páginas actualizar el contador de notificaciones del encabezado. */
export function usePanel() {
  return useContext(Contexto);
}

function textoContador(total: number) {
  return total > 9 ? '9+' : String(total);
}

export default function DisenoPanel({ rol, children }: { rol: RolUsuario; children: ReactNode }) {
  const configuracion = NAVEGACION[rol];
  const pathname = usePathname();
  const { usuario, cerrarSesion } = useAutenticacion();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [noLeidas, setNoLeidas] = useState(0);

  const enlaces = configuracion.grupos.flatMap((grupo) => grupo.enlaces);
  const enlaceNotificaciones = enlaces.find((enlace) => enlace.esNotificaciones);
  const enlaceActual = enlaces.find((enlace) => esEnlaceActivo(enlace.href, pathname, configuracion.inicio));
  const enlacePerfil = enlaces.find((enlace) => enlace.href.endsWith('/perfil'));

  const refrescarNoLeidas = useCallback(() => {
    if (!enlaceNotificaciones) return;
    notificacionesServicio
      .contarNoLeidas()
      .then((resultado) => setNoLeidas(resultado.total))
      .catch(() => setNoLeidas(0));
  }, [enlaceNotificaciones]);

  useEffect(() => {
    refrescarNoLeidas();
    setMenuAbierto(false);
  }, [pathname, refrescarNoLeidas]);

  // Bloquea el scroll del fondo y permite cerrar el menú móvil con Escape.
  useEffect(() => {
    if (!menuAbierto) return;
    document.body.style.overflow = 'hidden';
    const alPresionarTecla = (evento: KeyboardEvent) => evento.key === 'Escape' && setMenuAbierto(false);
    document.addEventListener('keydown', alPresionarTecla);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', alPresionarTecla);
    };
  }, [menuAbierto]);

  return (
    <Contexto.Provider value={{ noLeidas, refrescarNoLeidas }}>
      <div className="min-h-dvh bg-fondo">
        <a
          href="#contenido"
          className="sr-only z-[70] rounded-lg bg-white px-4 py-2 text-sm font-semibold text-marca-700 shadow-elevada focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Saltar al contenido
        </a>

        {/* Barra lateral de escritorio */}
        <aside className="no-imprimir fixed inset-y-0 left-0 z-30 hidden w-[272px] flex-col border-r border-slate-200/80 bg-white lg:flex">
          <ContenidoLateral configuracion={configuracion} pathname={pathname} noLeidas={noLeidas} onCerrarSesion={cerrarSesion} />
        </aside>

        {/* Menú lateral móvil */}
        {menuAbierto && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú de navegación">
            <div className="absolute inset-0 animate-desvanecer bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setMenuAbierto(false)} aria-hidden />
            <aside className="absolute inset-y-0 left-0 flex w-[86%] max-w-[300px] animate-deslizar flex-col bg-white shadow-flotante">
              <button
                type="button"
                onClick={() => setMenuAbierto(false)}
                className="absolute right-3 top-4 flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
                aria-label="Cerrar menú"
                autoFocus
              >
                <X className="h-5 w-5" />
              </button>
              <ContenidoLateral configuracion={configuracion} pathname={pathname} noLeidas={noLeidas} onCerrarSesion={cerrarSesion} />
            </aside>
          </div>
        )}

        <div className="lg:pl-[272px] print:!pl-0">
          {/* Barra superior */}
          <header className="no-imprimir sticky top-0 z-20 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-10">
              <button
                type="button"
                className="-ml-1.5 flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden"
                onClick={() => setMenuAbierto(true)}
                aria-label="Abrir menú"
                aria-expanded={menuAbierto}
              >
                <Menu className="h-5 w-5" />
              </button>
              <Link href={configuracion.inicio} className="lg:hidden" aria-label="Ir al inicio">
                <Logo />
              </Link>
              <div className="hidden min-w-0 items-center gap-2 text-sm lg:flex">
                <span className="text-slate-400">{configuracion.titulo}</span>
                {enlaceActual && (
                  <>
                    <span className="text-slate-300" aria-hidden>
                      /
                    </span>
                    <span className="truncate font-medium text-slate-700">{enlaceActual.texto}</span>
                  </>
                )}
              </div>

              <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
                {enlaceNotificaciones && (
                  <Link
                    href={enlaceNotificaciones.href}
                    className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-slate-100 ${
                      pathname === enlaceNotificaciones.href ? 'bg-marca-50 text-marca-700' : 'text-slate-500 hover:text-slate-700'
                    }`}
                    aria-label={noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : 'Notificaciones'}
                  >
                    <Bell className="h-5 w-5" />
                    {noLeidas > 0 && (
                      <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white cifras">
                        {textoContador(noLeidas)}
                      </span>
                    )}
                  </Link>
                )}
                <MenuUsuario
                  nombre={nombreCompleto(usuario)}
                  correo={usuario?.correo ?? ''}
                  usuario={usuario}
                  hrefPerfil={enlacePerfil?.href}
                  onCerrarSesion={cerrarSesion}
                />
              </div>
            </div>
          </header>

          <main id="contenido" tabIndex={-1} className="mx-auto max-w-7xl px-4 pb-28 pt-6 outline-none sm:px-6 sm:pt-8 lg:px-10 lg:pb-12">
            <div key={pathname} className="animate-desvanecer">
              {children}
            </div>
          </main>
        </div>

        {/* Navegación inferior móvil */}
        <nav
          className="no-imprimir fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
          aria-label="Navegación principal"
        >
          <ul className="mx-auto grid max-w-lg grid-cols-5">
            {enlaces
              .filter((enlace) => enlace.movil)
              .map((enlace) => (
                <li key={enlace.href}>
                  <EnlaceInferior enlace={enlace} activo={esEnlaceActivo(enlace.href, pathname, configuracion.inicio)} />
                </li>
              ))}
            <li>
              <button
                type="button"
                onClick={() => setMenuAbierto(true)}
                className="flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-slate-500"
              >
                <span className="relative">
                  <Menu className="h-[22px] w-[22px]" aria-hidden />
                </span>
                Más
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </Contexto.Provider>
  );
}

function EnlaceInferior({ enlace, activo }: { enlace: EnlaceNavegacion; activo: boolean }) {
  const Icono = enlace.icono;
  return (
    <Link
      href={enlace.href}
      aria-current={activo ? 'page' : undefined}
      className={`relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
        activo ? 'text-marca-700' : 'text-slate-500 hover:text-slate-800'
      }`}
    >
      {activo && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-marca-600" aria-hidden />}
      <Icono className="h-[22px] w-[22px]" strokeWidth={activo ? 2.25 : 1.75} aria-hidden />
      {enlace.textoCorto ?? enlace.texto}
    </Link>
  );
}

function ContenidoLateral({
  configuracion,
  pathname,
  noLeidas,
  onCerrarSesion,
}: {
  configuracion: ConfiguracionPanel;
  pathname: string;
  noLeidas: number;
  onCerrarSesion: () => void;
}) {
  const { usuario } = useAutenticacion();
  return (
    <>
      <div className="flex h-16 shrink-0 items-center px-6">
        <Link href={configuracion.inicio} aria-label="Ir al inicio">
          <Logo />
        </Link>
      </div>

      <div className="px-4 pb-2 pt-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-fresco-50 px-2.5 py-1 text-xs font-semibold text-fresco-800 ring-1 ring-inset ring-fresco-200/70">
          <span className="h-1.5 w-1.5 rounded-full bg-fresco-500" aria-hidden />
          {configuracion.titulo}
        </span>
      </div>

      {configuracion.accionPrincipal && (
        <div className="px-4 pb-1 pt-3">
          <Link href={configuracion.accionPrincipal.href} className={clasesBoton('primario', 'md', 'w-full')}>
            <Plus className="h-4 w-4" aria-hidden />
            {configuracion.accionPrincipal.texto}
          </Link>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Secciones del panel">
        {configuracion.grupos.map((grupo) => (
          <div key={grupo.titulo} className="mb-5 last:mb-0">
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">{grupo.titulo}</p>
            <ul className="flex flex-col gap-0.5">
              {grupo.enlaces.map((enlace) => {
                const activo = esEnlaceActivo(enlace.href, pathname, configuracion.inicio);
                const Icono = enlace.icono;
                return (
                  <li key={enlace.href}>
                    <Link
                      href={enlace.href}
                      aria-current={activo ? 'page' : undefined}
                      className={`group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors duration-150 ${
                        activo ? 'bg-marca-50 text-marca-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      {activo && <span className="absolute -left-3 top-2 h-6 w-1 rounded-r-full bg-marca-600" aria-hidden />}
                      <Icono
                        className={`h-[18px] w-[18px] shrink-0 ${activo ? 'text-marca-600' : 'text-slate-400 group-hover:text-slate-600'}`}
                        aria-hidden
                      />
                      <span className="truncate">{enlace.texto}</span>
                      {enlace.esNotificaciones && noLeidas > 0 && (
                        <span className="ml-auto rounded-full bg-marca-600 px-1.5 py-px text-[11px] font-semibold text-white cifras">
                          {textoContador(noLeidas)}
                          <span className="sr-only"> sin leer</span>
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar usuario={usuario} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{nombreCompleto(usuario)}</p>
            <p className="truncate text-xs text-slate-500">{usuario?.correo}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCerrarSesion}
          className="mt-1 flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-[18px] w-[18px]" aria-hidden />
          Cerrar sesión
        </button>
      </div>
    </>
  );
}

function MenuUsuario({
  nombre,
  correo,
  usuario,
  hrefPerfil,
  onCerrarSesion,
}: {
  nombre: string;
  correo: string;
  usuario: Parameters<typeof Avatar>[0]['usuario'];
  hrefPerfil?: string;
  onCerrarSesion: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const refContenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alHacerClic = (evento: MouseEvent) => {
      if (!refContenedor.current?.contains(evento.target as Node)) setAbierto(false);
    };
    const alPresionarTecla = (evento: KeyboardEvent) => evento.key === 'Escape' && setAbierto(false);
    document.addEventListener('mousedown', alHacerClic);
    document.addEventListener('keydown', alPresionarTecla);
    return () => {
      document.removeEventListener('mousedown', alHacerClic);
      document.removeEventListener('keydown', alPresionarTecla);
    };
  }, [abierto]);

  return (
    <div className="relative" ref={refContenedor}>
      <button
        type="button"
        onClick={() => setAbierto((valor) => !valor)}
        className="flex h-10 items-center gap-2 rounded-xl pl-1 pr-1 transition-colors hover:bg-slate-100 sm:pr-2"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label="Menú de la cuenta"
      >
        <Avatar usuario={usuario} tamano="sm" />
        <ChevronDown className={`hidden h-4 w-4 text-slate-400 transition-transform sm:block ${abierto ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {abierto && (
        <div
          role="menu"
          className="absolute right-0 top-12 w-64 animate-escalar rounded-2xl border border-slate-200 bg-white p-1.5 shadow-elevada"
        >
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-slate-900">{nombre}</p>
            <p className="truncate text-xs text-slate-500">{correo}</p>
          </div>
          <div className="my-1 h-px bg-slate-100" />
          {hrefPerfil && (
            <Link
              href={hrefPerfil}
              role="menuitem"
              onClick={() => setAbierto(false)}
              className="flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm text-slate-700 hover:bg-slate-50"
            >
              <UserRound className="h-4 w-4 text-slate-400" aria-hidden />
              Mi perfil
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={onCerrarSesion}
            className="flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-sm text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
