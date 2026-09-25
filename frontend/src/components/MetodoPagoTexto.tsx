import { Banknote, CreditCard } from 'lucide-react';
import { Pago } from '@/tipos';
import { TEXTO_METODO_PAGO } from '@/utilidades/estados';
import { TEXTO_MARCA } from '@/utilidades/tarjeta';

/** Método de un pago. Con tarjeta simulada muestra solo marca y últimos 4 dígitos (nunca el número completo). */
export default function MetodoPagoTexto({ pago }: { pago: Pick<Pago, 'metodo' | 'tarjetaMarca' | 'tarjetaUltimos4'> }) {
  if (pago.metodo === 'SIMULADO_TARJETA') {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <CreditCard className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        {pago.tarjetaMarca ? TEXTO_MARCA[pago.tarjetaMarca] : 'Tarjeta'} •••• {pago.tarjetaUltimos4}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {pago.metodo === 'EFECTIVO' && <Banknote className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />}
      {TEXTO_METODO_PAGO[pago.metodo]}
    </span>
  );
}
