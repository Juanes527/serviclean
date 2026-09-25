import { Usuario } from '@/tipos';
import { iniciales } from '@/utilidades/formato';

const TAMANOS = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-xl',
};

/** Paleta suave para diferenciar personas sin saturar la interfaz. */
const FONDOS = [
  'bg-marca-100 text-marca-700',
  'bg-fresco-100 text-fresco-800',
  'bg-sky-100 text-sky-700',
  'bg-indigo-100 text-indigo-700',
  'bg-slate-200 text-slate-700',
];

export default function Avatar({
  usuario,
  tamano = 'md',
}: {
  usuario?: Pick<Usuario, 'nombre' | 'apellido'> | null;
  tamano?: keyof typeof TAMANOS;
}) {
  const texto = iniciales(usuario) || '?';
  const indice = (texto.charCodeAt(0) + (texto.charCodeAt(1) || 0)) % FONDOS.length;
  return (
    <span
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold ${TAMANOS[tamano]} ${FONDOS[indice]}`}
      aria-hidden
    >
      {texto}
    </span>
  );
}
