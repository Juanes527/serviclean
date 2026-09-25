import { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, CircleAlert, Hourglass, Wallet } from 'lucide-react';
import { ResumenWallet } from '@/tipos';
import { formatearPrecio, referenciaLiquidacion } from '@/utilidades/formato';

/**
 * Resumen visual de una wallet. Tres estados claros:
 * saldo disponible (positivo), saldo pendiente con ServiClean (negativo) o sin saldo.
 */
export default function TarjetaWallet({ wallet, titulo = 'Mi wallet', acciones }: { wallet: ResumenWallet; titulo?: string; acciones?: ReactNode }) {
  const negativo = wallet.saldo < 0;
  const fondo = negativo
    ? 'from-amber-500 via-orange-500 to-rose-500'
    : 'from-marca-600 via-marca-700 to-fresco-700';

  return (
    <section
      aria-label={titulo}
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${fondo} p-6 text-white shadow-elevada sm:p-8`}
    >
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" aria-hidden />
      <div className="absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-white/5" aria-hidden />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-white/80">
            <Wallet className="h-4 w-4" aria-hidden />
            {titulo}
          </p>
          <p className="mt-4 text-sm font-medium text-white/90">{negativo ? 'Saldo pendiente con ServiClean' : 'Saldo disponible'}</p>
          <p className="mt-1 font-display text-4xl font-bold tracking-tight cifras sm:text-5xl">
            {negativo ? `−${formatearPrecio(wallet.saldoPendiente)}` : formatearPrecio(wallet.saldoDisponible)}
          </p>
          <p className="mt-3 flex max-w-md items-start gap-2 text-sm text-white/85">
            {negativo ? (
              <>
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Corresponde a comisiones de servicios cobrados en efectivo. Este valor se compensará con futuros servicios pagados con tarjeta.
              </>
            ) : wallet.liquidacionPendiente ? (
              <>
                <Hourglass className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Liquidación {referenciaLiquidacion(wallet.liquidacionPendiente.numero)} por {formatearPrecio(wallet.liquidacionPendiente.monto)} en proceso de pago.
              </>
            ) : wallet.saldo > 0 ? (
              'Este saldo se incluirá en tu próxima liquidación.'
            ) : (
              'No tienes saldo pendiente por liquidar.'
            )}
          </p>
        </div>

        <dl className="grid shrink-0 grid-cols-2 gap-3 sm:min-w-[22rem]">
          <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
            <dt className="flex items-center gap-1.5 text-xs text-white/80">
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> Generado
            </dt>
            <dd className="mt-1 text-lg font-bold cifras">{formatearPrecio(wallet.totalGenerado)}</dd>
          </div>
          <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
            <dt className="flex items-center gap-1.5 text-xs text-white/80">
              <ArrowDownRight className="h-3.5 w-3.5" aria-hidden /> Liquidado
            </dt>
            <dd className="mt-1 text-lg font-bold cifras">{formatearPrecio(wallet.totalLiquidado)}</dd>
          </div>
        </dl>
      </div>
      {acciones && <div className="relative mt-6 flex flex-wrap gap-2">{acciones}</div>}
    </section>
  );
}

/** Desglose secundario de la wallet: de dónde viene el saldo. */
export function DesgloseWallet({ wallet }: { wallet: ResumenWallet }) {
  const filas: { etiqueta: string; valor: number; ayuda: string; signo?: '+' | '−' }[] = [
    { etiqueta: 'Generado por tarjeta', valor: wallet.generadoTarjeta, ayuda: 'Tu parte de servicios pagados en línea', signo: '+' },
    { etiqueta: 'Generado en efectivo', valor: wallet.generadoEfectivo, ayuda: 'Tu parte de servicios pagados en efectivo', signo: '+' },
    { etiqueta: 'Efectivo recibido', valor: wallet.efectivoRecibido, ayuda: 'Dinero que el cliente te entregó directamente', signo: '−' },
    { etiqueta: 'Bonificaciones y ajustes', valor: wallet.bonificaciones + wallet.ajustes, ayuda: 'Autorizados por el administrador' },
    { etiqueta: 'Descuentos', valor: wallet.descuentos, ayuda: 'Autorizados por el administrador', signo: '−' },
    { etiqueta: 'Liquidado', valor: wallet.totalLiquidado, ayuda: 'Pagado por ServiClean', signo: '−' },
  ];
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {filas.map((fila) => (
        <div key={fila.etiqueta} className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-suave">
          <dt className="text-sm text-slate-500">{fila.etiqueta}</dt>
          <dd className="mt-1 font-display text-xl font-bold text-slate-900 cifras">
            {fila.signo && fila.valor !== 0 ? `${fila.signo}${formatearPrecio(fila.valor)}` : formatearPrecio(fila.valor)}
          </dd>
          <dd className="text-xs text-slate-400">{fila.ayuda}</dd>
        </div>
      ))}
    </dl>
  );
}
