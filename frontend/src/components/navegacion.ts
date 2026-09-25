import {
  Bell,
  CalendarClock,
  CalendarDays,
  ChartColumn,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  History,
  House,
  Landmark,
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  Receipt,
  LucideIcon,
  Sparkles,
  UserRound,
  UserRoundCog,
  UsersRound,
  Users,
  Wallet,
} from 'lucide-react';
import { RolUsuario } from '@/tipos';

export interface EnlaceNavegacion {
  href: string;
  texto: string;
  /** Texto corto para la barra inferior móvil. */
  textoCorto?: string;
  icono: LucideIcon;
  /** Aparece en la barra de navegación inferior en móvil (máximo 4 por rol). */
  movil?: boolean;
  esNotificaciones?: boolean;
}

export interface GrupoNavegacion {
  titulo: string;
  enlaces: EnlaceNavegacion[];
}

export interface ConfiguracionPanel {
  titulo: string;
  inicio: string;
  grupos: GrupoNavegacion[];
  accionPrincipal?: { href: string; texto: string };
}

const CUENTA_CLIENTE: GrupoNavegacion = {
  titulo: 'Cuenta',
  enlaces: [
    { href: '/cliente/notificaciones', texto: 'Notificaciones', icono: Bell, esNotificaciones: true },
    { href: '/cliente/perfil', texto: 'Mi perfil', icono: UserRound },
  ],
};

export const NAVEGACION: Record<RolUsuario, ConfiguracionPanel> = {
  CLIENTE: {
    titulo: 'Panel del cliente',
    inicio: '/cliente',
    accionPrincipal: { href: '/cliente/servicios', texto: 'Solicitar servicio' },
    grupos: [
      {
        titulo: 'Principal',
        enlaces: [
          { href: '/cliente', texto: 'Inicio', icono: House, movil: true },
          { href: '/cliente/servicios', texto: 'Catálogo de servicios', textoCorto: 'Catálogo', icono: Sparkles, movil: true },
          { href: '/cliente/mis-servicios', texto: 'Mis servicios', textoCorto: 'Servicios', icono: ClipboardList, movil: true },
          { href: '/cliente/agenda', texto: 'Agenda', icono: CalendarDays, movil: true },
          { href: '/cliente/historial', texto: 'Historial', icono: History },
          { href: '/cliente/pagos', texto: 'Mis pagos', icono: Receipt },
        ],
      },
      CUENTA_CLIENTE,
    ],
  },
  PERSONAL_ASEO: {
    titulo: 'Panel del personal',
    inicio: '/personal',
    grupos: [
      {
        titulo: 'Principal',
        enlaces: [
          { href: '/personal', texto: 'Inicio', icono: House, movil: true },
          { href: '/personal/servicios', texto: 'Servicios asignados', textoCorto: 'Servicios', icono: ClipboardCheck, movil: true },
          { href: '/personal/agenda', texto: 'Agenda', icono: CalendarDays, movil: true },
          { href: '/personal/disponibilidad', texto: 'Disponibilidad', textoCorto: 'Horarios', icono: CalendarClock, movil: true },
          { href: '/personal/historial', texto: 'Historial', icono: History },
        ],
      },
      {
        titulo: 'Finanzas',
        enlaces: [{ href: '/personal/wallet', texto: 'Mi wallet', icono: Wallet }],
      },
      {
        titulo: 'Cuenta',
        enlaces: [
          { href: '/personal/notificaciones', texto: 'Notificaciones', icono: Bell, esNotificaciones: true },
          { href: '/personal/perfil', texto: 'Mi perfil', icono: UserRound },
        ],
      },
    ],
  },
  ADMINISTRADOR: {
    titulo: 'Panel administrativo',
    inicio: '/admin',
    grupos: [
      {
        titulo: 'General',
        enlaces: [
          { href: '/admin', texto: 'Dashboard', textoCorto: 'Inicio', icono: LayoutDashboard, movil: true },
          { href: '/admin/reportes', texto: 'Reportes', icono: ChartColumn },
        ],
      },
      {
        titulo: 'Operación',
        enlaces: [
          { href: '/admin/solicitudes', texto: 'Solicitudes', icono: ClipboardList, movil: true },
          { href: '/admin/asignaciones', texto: 'Asignaciones', icono: UserRoundCog, movil: true },
          { href: '/admin/servicios', texto: 'Servicios', icono: Sparkles },
          { href: '/admin/usuarios', texto: 'Usuarios', icono: Users, movil: true },
        ],
      },
      {
        titulo: 'Finanzas',
        enlaces: [
          { href: '/admin/finanzas', texto: 'Resumen financiero', textoCorto: 'Finanzas', icono: PiggyBank },
          { href: '/admin/ingresos-egresos', texto: 'Ingresos y egresos', icono: ArrowLeftRight },
          { href: '/admin/pagos', texto: 'Pagos', icono: CreditCard },
          { href: '/admin/personal', texto: 'Wallets del personal', icono: UsersRound },
          { href: '/admin/liquidaciones', texto: 'Liquidaciones', icono: Landmark },
        ],
      },
      {
        titulo: 'Cuenta',
        enlaces: [{ href: '/admin/perfil', texto: 'Mi perfil', icono: UserRound }],
      },
    ],
  },
};

/** Un enlace está activo si coincide exactamente (inicio del rol) o si es prefijo de la ruta actual. */
export function esEnlaceActivo(href: string, rutaActual: string, inicio: string): boolean {
  if (href === inicio) return rutaActual === href;
  return rutaActual === href || rutaActual.startsWith(`${href}/`);
}
