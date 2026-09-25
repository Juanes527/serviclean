'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { History, Landmark, Receipt, SearchX, SlidersHorizontal } from 'lucide-react';
import Alerta from '@/components/Alerta';
import { useAvisos } from '@/components/Avisos';
import Boton from '@/components/Boton';
import CampoSelect from '@/components/CampoSelect';
import CampoTexto from '@/components/CampoTexto';
import DetalleLiquidacion from '@/components/DetalleLiquidacion';
import EncabezadoPagina from '@/components/EncabezadoPagina';
import { Esqueleto, EsqueletoLista } from '@/components/Esqueleto';
import EstadoBadge from '@/components/EstadoBadge';
import EstadoVacio, { EstadoError } from '@/components/EstadoVacio';
import Modal from '@/components/Modal';
import TablaMovimientos from '@/components/TablaMovimientos';
import Tarjeta, { EncabezadoTarjeta } from '@/components/Tarjeta';
import TarjetaWallet, { DesgloseWallet } from '@/components/TarjetaWallet';
import { liquidacionesServicio } from '@/servicios/liquidaciones.servicio';
import { DatosAjuste, walletServicio } from '@/servicios/wallet.servicio';
import { mensajeError } from '@/utilidades/errores';
import { formatearPeriodo, formatearPrecio, nombreCompleto, referenciaLiquidacion } from '@/utilidades/formato';
import { useCarga } from '@/utilidades/useCarga';

const AYUDA_AJUSTE: Record<DatosAjuste['tipo'], string> = {
  BONIFICACION: 'Suma al saldo del trabajador (por ejemplo, un incentivo).',
  DESCUENTO: 'Resta del saldo del trabajador (por ejemplo, reposición de implementos).',
  AJUSTE: 'Corrección: usa un valor positivo para sumar o negativo para restar.',
};

export default function WalletTrabajador() {
  const { id } = useParams<{ id: string }>();
  const { avisar } = useAvisos();
  const { datos, cargando, error, recargar } = useCarga(
    () => Promise.all([walletServicio.dePersonal(id), walletServicio.movimientosDePersonal(id), liquidacionesServicio.listar({ personalId: id })]),
    [id],
  );

  const [modalAjuste, setModalAjuste] = useState(false);
  const [ajuste, setAjuste] = useState<{ tipo: DatosAjuste['tipo']; monto: string; concepto: string; clave: string }>({
    tipo: 'BONIFICACION',
    monto: '',
    concepto: '',
    clave: '',
  });
  const [modalLiquidar, setModalLiquidar] = useState(false);
  const [observaciones, setObservaciones] = useState('');
  const vistaPrevia = useCarga(() => (modalLiquidar ? liquidacionesServicio.vistaPrevia(id) : Promise.resolve(null)), [modalLiquidar, id]);
  const [liquidacionAbierta, setLiquidacionAbierta] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [errorModal, setErrorModal] = useState('');

  const abrirAjuste = () => {
    // La clave de idempotencia evita registrar dos veces el mismo ajuste (doble clic o reintento).
    setAjuste({ tipo: 'BONIFICACION', monto: '', concepto: '', clave: crypto.randomUUID() });
    setErrorModal('');
    setModalAjuste(true);
  };

  const guardarAjuste = async () => {
    const monto = Number(ajuste.monto.replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(monto) || monto === 0) return setErrorModal('Ingresa un monto distinto de cero.');
    if (!ajuste.concepto.trim()) return setErrorModal('Describe el motivo del ajuste.');
    setProcesando(true);
    setErrorModal('');
    try {
      await walletServicio.crearAjuste(id, { tipo: ajuste.tipo, monto, concepto: ajuste.concepto.trim(), claveIdempotencia: ajuste.clave });
      avisar({ tipo: 'exito', titulo: 'Ajuste registrado', descripcion: ajuste.concepto.trim() });
      setModalAjuste(false);
      await recargar(true);
    } catch (excepcion) {
      setErrorModal(mensajeError(excepcion, 'No fue posible registrar el ajuste.'));
    } finally {
      setProcesando(false);
    }
  };

  const generarLiquidacion = async () => {
    setProcesando(true);
    setErrorModal('');
    try {
      const creada = await liquidacionesServicio.crear(id, observaciones.trim() || undefined);
      avisar({ tipo: 'exito', titulo: `Liquidación ${referenciaLiquidacion(creada.numero)} generada`, descripcion: formatearPrecio(creada.monto) });
      setModalLiquidar(false);
      await recargar(true);
    } catch (excepcion) {
      setErrorModal(mensajeError(excepcion, 'No fue posible generar la liquidación.'));
    } finally {
      setProcesando(false);
    }
  };

  const volver = { href: '/admin/personal', texto: 'Wallets del personal' };

  if (cargando) {
    return (
      <div className="flex flex-col gap-6" role="status" aria-label="Cargando wallet">
        <EncabezadoPagina titulo="Wallet" volver={volver} />
        <Esqueleto className="h-56 rounded-3xl" />
        <EsqueletoLista filas={5} />
      </div>
    );
  }

  if (error || !datos) {
    return (
      <div className="flex flex-col gap-6">
        <EncabezadoPagina titulo="Wallet" volver={volver} />
        <EstadoError mensaje={error} onReintentar={() => recargar()} />
      </div>
    );
  }

  const [wallet, movimientos, liquidaciones] = datos;
  const previa = vistaPrevia.datos;

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo={nombreCompleto(wallet.personal)}
        descripcion={`${wallet.personal.correo} · ${wallet.serviciosLiquidados} servicios registrados en su wallet`}
        volver={volver}
        acciones={
          <>
            <Boton variante="contorno" icono={<SlidersHorizontal className="h-4 w-4" />} onClick={abrirAjuste} className="w-full sm:w-auto">
              Registrar ajuste
            </Boton>
            <Boton
              icono={<Landmark className="h-4 w-4" />}
              onClick={() => {
                setObservaciones('');
                setErrorModal('');
                setModalLiquidar(true);
              }}
              className="w-full sm:w-auto"
            >
              Generar liquidación
            </Boton>
          </>
        }
      />

      <TarjetaWallet wallet={wallet} titulo="Wallet" />
      <DesgloseWallet wallet={wallet} />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
        <section aria-labelledby="titulo-historial" className="flex min-w-0 flex-col gap-4 xl:col-span-2">
          <h2 id="titulo-historial" className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <History className="h-5 w-5 text-slate-400" aria-hidden /> Historial de movimientos
          </h2>
          {movimientos.length === 0 ? (
            <EstadoVacio icono={SearchX} titulo="Sin movimientos" descripcion="Los servicios finalizados y pagados aparecerán aquí." />
          ) : (
            <TablaMovimientos movimientos={movimientos} />
          )}
        </section>

        <Tarjeta relleno="ninguno">
          <EncabezadoTarjeta className="px-5 pt-5" titulo="Historial de liquidaciones" descripcion={`${liquidaciones.length} registradas`} />
          {liquidaciones.length === 0 ? (
            <EstadoVacio compacto icono={Landmark} titulo="Sin liquidaciones" descripcion="Genera la primera cuando el trabajador tenga saldo disponible." />
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {liquidaciones.map((liquidacion) => (
                <li key={liquidacion.id}>
                  <button
                    type="button"
                    onClick={() => setLiquidacionAbierta(liquidacion.id)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <Receipt className="h-4 w-4 text-slate-400" aria-hidden />
                        {referenciaLiquidacion(liquidacion.numero)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{formatearPeriodo(liquidacion.periodoInicio, liquidacion.periodoFin)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-semibold text-slate-900 cifras">{formatearPrecio(liquidacion.monto)}</span>
                      <EstadoBadge tipo="liquidacion" estado={liquidacion.estado} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      <DetalleLiquidacion liquidacionId={liquidacionAbierta} onCerrar={() => setLiquidacionAbierta(null)} />

      <Modal
        abierto={modalAjuste}
        titulo="Registrar ajuste"
        descripcion={`Movimiento autorizado en la wallet de ${nombreCompleto(wallet.personal)}. Queda registrado con tu usuario y no se puede borrar.`}
        onCerrar={() => !procesando && setModalAjuste(false)}
        pie={
          <>
            <Boton variante="contorno" onClick={() => setModalAjuste(false)} disabled={procesando}>
              Cancelar
            </Boton>
            <Boton onClick={guardarAjuste} cargando={procesando}>
              Registrar ajuste
            </Boton>
          </>
        }
      >
        <div className="flex flex-col gap-4 pb-2">
          {errorModal && <Alerta tipo="error" mensaje={errorModal} />}
          <CampoSelect
            etiqueta="Tipo"
            value={ajuste.tipo}
            onChange={(e) => setAjuste((a) => ({ ...a, tipo: e.target.value as DatosAjuste['tipo'] }))}
            opciones={[
              { valor: 'BONIFICACION', texto: 'Bonificación (+)' },
              { valor: 'DESCUENTO', texto: 'Descuento (−)' },
              { valor: 'AJUSTE', texto: 'Ajuste (+/−)' },
            ]}
            ayuda={AYUDA_AJUSTE[ajuste.tipo]}
          />
          <CampoTexto
            etiqueta="Monto (COP)"
            inputMode="decimal"
            placeholder={ajuste.tipo === 'AJUSTE' ? 'Ej.: -15000' : 'Ej.: 20000'}
            value={ajuste.monto}
            onChange={(e) => setAjuste((a) => ({ ...a, monto: e.target.value.replace(ajuste.tipo === 'AJUSTE' ? /[^\d.,-]/g : /[^\d.,]/g, '') }))}
            required
          />
          <CampoTexto
            etiqueta="Motivo"
            placeholder="Ej.: Bonificación por calificación perfecta"
            value={ajuste.concepto}
            maxLength={200}
            onChange={(e) => setAjuste((a) => ({ ...a, concepto: e.target.value }))}
            required
          />
        </div>
      </Modal>

      <Modal
        abierto={modalLiquidar}
        titulo="Generar liquidación"
        descripcion="Liquida el saldo acumulado desde la última liquidación pagada."
        onCerrar={() => !procesando && setModalLiquidar(false)}
        pie={
          <>
            <Boton variante="contorno" onClick={() => setModalLiquidar(false)} disabled={procesando}>
              Cancelar
            </Boton>
            <Boton onClick={generarLiquidacion} cargando={procesando} disabled={!previa || !!previa.motivo}>
              Generar liquidación
            </Boton>
          </>
        }
      >
        <div className="flex flex-col gap-4 pb-2">
          {errorModal && <Alerta tipo="error" mensaje={errorModal} />}
          {vistaPrevia.cargando || !previa ? (
            <Esqueleto className="h-44 rounded-2xl" />
          ) : (
            <>
              {previa.motivo && <Alerta tipo="advertencia" mensaje={previa.motivo} />}
              <dl className="rounded-2xl bg-slate-50/80 px-4 py-2 text-sm">
                <div className="flex justify-between py-2 text-slate-600">
                  <dt>Periodo</dt>
                  <dd>{formatearPeriodo(previa.periodoInicio, previa.periodoFin)}</dd>
                </div>
                <div className="flex justify-between py-2 text-slate-600">
                  <dt>Saldo inicial</dt>
                  <dd className="cifras">{formatearPrecio(previa.saldoInicial)}</dd>
                </div>
                <div className="flex justify-between py-2 text-slate-600">
                  <dt>Ingresos</dt>
                  <dd className="text-emerald-700 cifras">+{formatearPrecio(previa.ingresos)}</dd>
                </div>
                <div className="flex justify-between py-2 text-slate-600">
                  <dt>Descuentos (incluye efectivo recibido)</dt>
                  <dd className="text-red-600 cifras">−{formatearPrecio(previa.descuentos)}</dd>
                </div>
                <div className="flex justify-between py-2 text-slate-600">
                  <dt>Ajustes</dt>
                  <dd className="cifras">{formatearPrecio(previa.ajustes)}</dd>
                </div>
                <div className="flex justify-between border-t border-slate-200 py-3 font-semibold text-slate-900">
                  <dt>Total a liquidar</dt>
                  <dd className={`font-display text-lg cifras ${previa.monto < 0 ? 'text-red-600' : ''}`}>
                    {previa.monto < 0 ? `−${formatearPrecio(Math.abs(previa.monto))}` : formatearPrecio(previa.monto)}
                  </dd>
                </div>
              </dl>
              {!previa.motivo && (
                <CampoTexto etiqueta="Observaciones (opcional)" value={observaciones} maxLength={300} onChange={(e) => setObservaciones(e.target.value)} />
              )}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
