import {
  Bath,
  BedDouble,
  Building2,
  Droplet,
  House,
  LucideIcon,
  Shirt,
  Sofa,
  Sparkles,
  SprayCan,
  Utensils,
  WashingMachine,
  Wind,
} from 'lucide-react';

/** Iconos disponibles para los servicios. La clave coincide con el campo `icono` guardado en la API. */
export const ICONOS_SERVICIO: Record<string, { Icono: LucideIcon; nombre: string }> = {
  sparkles: { Icono: Sparkles, nombre: 'Limpieza general' },
  home: { Icono: House, nombre: 'Hogar' },
  utensils: { Icono: Utensils, nombre: 'Cocina' },
  droplet: { Icono: Droplet, nombre: 'Lavado' },
  bath: { Icono: Bath, nombre: 'Baños' },
  bed: { Icono: BedDouble, nombre: 'Habitaciones' },
  sofa: { Icono: Sofa, nombre: 'Muebles' },
  shirt: { Icono: Shirt, nombre: 'Ropa' },
  'washing-machine': { Icono: WashingMachine, nombre: 'Lavandería' },
  'spray-can': { Icono: SprayCan, nombre: 'Desinfección' },
  wind: { Icono: Wind, nombre: 'Ventanas' },
  building: { Icono: Building2, nombre: 'Oficinas' },
};

const TAMANOS = {
  sm: { caja: 'h-9 w-9 rounded-xl', icono: 'h-[18px] w-[18px]' },
  md: { caja: 'h-11 w-11 rounded-xl', icono: 'h-5 w-5' },
  lg: { caja: 'h-14 w-14 rounded-2xl', icono: 'h-7 w-7' },
};

export default function IconoServicio({ icono, tamano = 'md', apagado = false }: { icono?: string; tamano?: keyof typeof TAMANOS; apagado?: boolean }) {
  const { Icono } = ICONOS_SERVICIO[icono ?? ''] ?? ICONOS_SERVICIO.sparkles;
  return (
    <span
      className={`flex shrink-0 items-center justify-center ${TAMANOS[tamano].caja} ${
        apagado ? 'bg-slate-100 text-slate-400' : 'bg-gradient-to-br from-marca-50 to-fresco-50 text-marca-600 ring-1 ring-inset ring-marca-100'
      }`}
    >
      <Icono className={TAMANOS[tamano].icono} strokeWidth={1.75} aria-hidden />
    </span>
  );
}
