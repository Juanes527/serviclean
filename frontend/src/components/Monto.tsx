import { formatearMontoConSigno, formatearPrecio } from '@/utilidades/formato';

/** Monto de un movimiento: verde si suma, rojo si resta, siempre con signo. */
export default function Monto({ valor, conSigno = true, className = '' }: { valor: string | number; conSigno?: boolean; className?: string }) {
  const numero = Number(valor);
  const color = numero > 0 ? 'text-emerald-700' : numero < 0 ? 'text-red-600' : 'text-slate-500';
  return (
    <span className={`font-semibold cifras ${color} ${className}`}>{conSigno ? formatearMontoConSigno(numero) : formatearPrecio(numero)}</span>
  );
}
