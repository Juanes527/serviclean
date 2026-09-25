'use client';

import { ReactNode } from 'react';
import { liquidacionesServicio } from '@/servicios/liquidaciones.servicio';
import { formatearFechaHora, formatearPeriodo, formatearPrecio, nombreCompleto, referenciaLiquidacion, referenciaServicio } from '@/utilidades/formato';
import { useCarga } from '@/utilidades/useCarga';
import Alerta from './Alerta';
import { Esqueleto } from './Esqueleto';
import EstadoBadge from './EstadoBadge';
import Modal from './Modal';
import Monto from './Monto';

function Fila({ etiqueta, valor, fuerte = false }: { etiqueta: string; valor: ReactNode; fuerte?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-2 text-sm ${fuerte ? 'border-t border-slate-200 pt-3 font-semibold text-slate-900' : 'text-slate-600'}`}>
      <dt>{etiqueta}</dt>
      <dd className="cifras">{valor}</dd>
    </div>
  );
}

/** Detalle de una liquidación: desglose del periodo y movimientos que cubre. */
export default function DetalleLiquidacion({ liquidacionId, onCerrar, acciones }: { liquidacionId: string | null; onCerrar: () => void; acciones?: ReactNode }) {
  const { datos: liquidacion, cargando, error } = useCarga(
    () => (liquidacionId ? liquidacionesServicio.obtener(liquidacionId) : Promise.resolve(null)),
    [liquidacionId],
  );

  return (
    <Modal
      abierto={!!liquidacionId}
      titulo={liquidacion ? `Liquidación ${referenciaLiquidacion(liquidacion.numero)}` : 'Liquidación'}
      descripcion={liquidacion ? `${nombreCompleto(liquidacion.wallet.personal)} · ${formatearPeriodo(liquidacion.periodoInicio, liquidacion.periodoFin)}` : undefined}
      onCerrar={onCerrar}
      tamano="lg"
      pie={acciones}
    >
      {cargando ? (
        <div className="flex flex-col gap-3 pb-2">
          <Esqueleto className="h-40 rounded-2xl" />
          <Esqueleto className="h-24 rounded-2xl" />
        </div>
      ) : error || !liquidacion ? (
        <Alerta tipo="error" mensaje={error || 'No fue posible cargar la liquidación.'} />
      ) : (
        <div className="flex flex-col gap-5 pb-2">
          <div className="flex items-center justify-between gap-3">
            <EstadoBadge tipo="liquidacion" estado={liquidacion.estado} />
            <p className="text-xs text-slate-500">
              {liquidacion.estado === 'PAGADA' && liquidacion.fechaPago
                ? `Pagada el ${formatearFechaHora(liquidacion.fechaPago)}${liquidacion.pagadaPor ? ` por ${nombreCompleto(liquidacion.pagadaPor)}` : ''}`
                : liquidacion.estado === 'CANCELADA' && liquidacion.fechaCancelacion
                  ? `Cancelada el ${formatearFechaHora(liquidacion.fechaCancelacion)}`
                  : `Generada el ${formatearFechaHora(liquidacion.fechaCreacion)}`}
            </p>
          </div>

          <dl className="rounded-2xl bg-slate-50/80 px-4 py-2 sm:px-5">
            <Fila etiqueta="Saldo inicial" valor={formatearPrecio(liquidacion.saldoInicial)} />
            <Fila etiqueta="Ingresos" valor={<Monto valor={liquidacion.ingresos} />} />
            <Fila etiqueta="Descuentos (incluye efectivo recibido)" valor={<Monto valor={-Number(liquidacion.descuentos)} />} />
            <Fila etiqueta="Ajustes" valor={<Monto valor={liquidacion.ajustes} />} />
            <Fila etiqueta="Total a liquidar" valor={<span className="font-display text-lg">{formatearPrecio(liquidacion.monto)}</span>} fuerte />
          </dl>

          {liquidacion.observaciones && <p className="text-sm text-slate-600">{liquidacion.observaciones}</p>}

          {liquidacion.movimientos && liquidacion.movimientos.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Movimientos incluidos ({liquidacion.movimientos.length})</p>
              <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80">
                {liquidacion.movimientos.map((movimiento) => (
                  <li key={movimiento.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate text-slate-800">{movimiento.concepto}</p>
                      <p className="text-xs text-slate-500">
                        {formatearFechaHora(movimiento.fecha)}
                        {movimiento.solicitudId ? ` · ${referenciaServicio(movimiento.solicitudId)}` : ''}
                      </p>
                    </div>
                    <Monto valor={movimiento.monto} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
