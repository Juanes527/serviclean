import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { MovimientoWallet } from '@/tipos';
import { formatearFechaHora, formatearPrecio, nombreCompleto, referenciaLiquidacion, referenciaServicio } from '@/utilidades/formato';
import EstadoBadge from './EstadoBadge';
import Monto from './Monto';
import Tabla, { CeldaPrincipal, ColumnaTabla } from './Tabla';

function referencia(movimiento: MovimientoWallet): string {
  if (movimiento.liquidacion) return referenciaLiquidacion(movimiento.liquidacion.numero);
  if (movimiento.solicitudId) return referenciaServicio(movimiento.solicitudId);
  return '—';
}

/** Historial (ledger) de movimientos de wallet: fecha, concepto, servicio, movimiento y saldo resultante. */
export default function TablaMovimientos({ movimientos, mostrarPersonal = false }: { movimientos: MovimientoWallet[]; mostrarPersonal?: boolean }) {
  const columnas: ColumnaTabla<MovimientoWallet>[] = [
    { clave: 'fecha', titulo: 'Fecha', ocultarEnMovil: true, render: (m) => formatearFechaHora(m.fecha) },
    ...(mostrarPersonal
      ? [{ clave: 'personal', titulo: 'Trabajador', render: (m: MovimientoWallet) => nombreCompleto(m.wallet?.personal) }]
      : []),
    {
      clave: 'concepto',
      titulo: 'Concepto',
      ocultarEnMovil: true,
      render: (m) => (
        <CeldaPrincipal
          icono={
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                Number(m.monto) >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
              }`}
            >
              {Number(m.monto) >= 0 ? <ArrowUpRight className="h-4 w-4" aria-hidden /> : <ArrowDownLeft className="h-4 w-4" aria-hidden />}
            </span>
          }
          titulo={m.concepto}
          subtitulo={m.autorizadoPor ? `Autorizado por ${nombreCompleto(m.autorizadoPor)}` : undefined}
        />
      ),
    },
    { clave: 'tipo', titulo: 'Tipo', render: (m) => <EstadoBadge tipo="movimiento" estado={m.tipo} /> },
    { clave: 'referencia', titulo: 'Servicio', render: (m) => <span className="font-mono text-[13px]">{referencia(m)}</span> },
    { clave: 'monto', titulo: 'Movimiento', alineacion: 'derecha', render: (m) => <Monto valor={m.monto} /> },
    {
      clave: 'saldo',
      titulo: 'Saldo',
      alineacion: 'derecha',
      render: (m) => (
        <span className={`font-semibold ${Number(m.saldoPosterior) < 0 ? 'text-red-600' : 'text-slate-900'}`}>
          {Number(m.saldoPosterior) < 0 ? `−${formatearPrecio(Math.abs(Number(m.saldoPosterior)))}` : formatearPrecio(m.saldoPosterior)}
        </span>
      ),
    },
  ];

  return (
    <Tabla
      etiqueta="Historial de movimientos"
      columnas={columnas}
      filas={movimientos}
      claveFila={(m) => m.id}
      resumenMovil={(m) => <CeldaPrincipal titulo={m.concepto} subtitulo={formatearFechaHora(m.fecha)} />}
    />
  );
}
