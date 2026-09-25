'use client';

import { useMemo, useState } from 'react';
import { CircleCheck, Eye, Hourglass, Landmark, SearchX, Sparkles, XCircle } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useAvisos } from '@/components/Avisos';
import Boton from '@/components/Boton';
import CampoSelect from '@/components/CampoSelect';
import DetalleLiquidacion from '@/components/DetalleLiquidacion';
import DialogoConfirmacion from '@/components/DialogoConfirmacion';
import EncabezadoPagina from '@/components/EncabezadoPagina';
import { EsqueletoLista, EsqueletoMetricas } from '@/components/Esqueleto';
import EstadoBadge from '@/components/EstadoBadge';
import EstadoVacio, { EstadoError } from '@/components/EstadoVacio';
import FiltroFechas from '@/components/FiltroFechas';
import { FiltroSegmentado } from '@/components/Filtros';
import Metrica from '@/components/Metrica';
import Tabla, { CeldaPrincipal, ColumnaTabla } from '@/components/Tabla';
import { liquidacionesServicio } from '@/servicios/liquidaciones.servicio';
import { usuariosServicio } from '@/servicios/usuarios.servicio';
import { EstadoLiquidacion, Liquidacion } from '@/tipos';
import { mensajeError } from '@/utilidades/errores';
import { formatearFechaHora, formatearPeriodo, formatearPrecio, nombreCompleto, referenciaLiquidacion } from '@/utilidades/formato';
import { useCarga } from '@/utilidades/useCarga';

type Filtro = 'TODAS' | EstadoLiquidacion;
type Accion = { tipo: 'pagar' | 'cancelar'; liquidacion: Liquidacion } | { tipo: 'generar' };

export default function LiquidacionesAdmin() {
  const { avisar } = useAvisos();
  const [estado, setEstado] = useState<Filtro>('TODAS');
  const [personalId, setPersonalId] = useState('');
  const [rango, setRango] = useState({ desde: '', hasta: '' });
  const [detalle, setDetalle] = useState<Liquidacion | null>(null);
  const [accion, setAccion] = useState<Accion | null>(null);
  const [procesando, setProcesando] = useState(false);

  const { datos: personal } = useCarga(() => usuariosServicio.listar('PERSONAL_ASEO'));
  const { datos, cargando, error, recargar } = useCarga(
    () => liquidacionesServicio.listar({ personalId: personalId || undefined, ...rango }),
    [personalId, rango.desde, rango.hasta],
  );
  const liquidaciones = useMemo(() => datos ?? [], [datos]);
  const filtradas = liquidaciones.filter((l) => estado === 'TODAS' || l.estado === estado);
  const suma = (lista: Liquidacion[]) => lista.reduce((total, l) => total + Number(l.monto), 0);
  const pagadas = liquidaciones.filter((l) => l.estado === 'PAGADA');
  const pendientes = liquidaciones.filter((l) => l.estado === 'PENDIENTE');

  const ejecutar = async () => {
    if (!accion) return;
    setProcesando(true);
    try {
      if (accion.tipo === 'generar') {
        const resultado = await liquidacionesServicio.generarPeriodo();
        avisar({
          tipo: resultado.creadas.length > 0 ? 'exito' : 'info',
          titulo:
            resultado.creadas.length > 0
              ? `${resultado.creadas.length} ${resultado.creadas.length === 1 ? 'liquidación generada' : 'liquidaciones generadas'}`
              : 'No se generaron liquidaciones',
          descripcion: resultado.omitidas.length > 0 ? `Omitidos: ${resultado.omitidas.map((o) => `${o.nombre} (${o.motivo})`).join(' ')}` : undefined,
        });
      } else if (accion.tipo === 'pagar') {
        await liquidacionesServicio.pagar(accion.liquidacion.id);
        avisar({ tipo: 'exito', titulo: `Liquidación ${referenciaLiquidacion(accion.liquidacion.numero)} pagada`, descripcion: formatearPrecio(accion.liquidacion.monto) });
      } else {
        await liquidacionesServicio.cancelar(accion.liquidacion.id);
        avisar({ tipo: 'exito', titulo: `Liquidación ${referenciaLiquidacion(accion.liquidacion.numero)} cancelada` });
      }
      setAccion(null);
      setDetalle(null);
      await recargar(true);
    } catch (excepcion) {
      avisar({ tipo: 'error', titulo: 'No se pudo completar la acción', descripcion: mensajeError(excepcion, 'Inténtalo de nuevo.') });
    } finally {
      setProcesando(false);
    }
  };

  const accionesFila = (liquidacion: Liquidacion) =>
    liquidacion.estado === 'PENDIENTE' ? (
      <>
        <Boton variante="exito" tamano="sm" icono={<CircleCheck className="h-4 w-4" />} onClick={() => setAccion({ tipo: 'pagar', liquidacion })}>
          Marcar pagada
        </Boton>
        <Boton variante="fantasmaPeligro" tamano="sm" onClick={() => setAccion({ tipo: 'cancelar', liquidacion })}>
          Cancelar
        </Boton>
      </>
    ) : null;

  const columnas: ColumnaTabla<Liquidacion>[] = [
    {
      clave: 'personal',
      titulo: 'Trabajador',
      ocultarEnMovil: true,
      render: (l) => (
        <CeldaPrincipal
          icono={<Avatar usuario={l.wallet.personal} tamano="sm" />}
          titulo={nombreCompleto(l.wallet.personal)}
          subtitulo={referenciaLiquidacion(l.numero)}
        />
      ),
    },
    { clave: 'periodo', titulo: 'Periodo', render: (l) => formatearPeriodo(l.periodoInicio, l.periodoFin) },
    { clave: 'fecha', titulo: 'Fecha', render: (l) => formatearFechaHora(l.fechaPago ?? l.fechaCreacion) },
    { clave: 'estado', titulo: 'Estado', ocultarEnMovil: true, render: (l) => <EstadoBadge tipo="liquidacion" estado={l.estado} /> },
    { clave: 'monto', titulo: 'Monto', alineacion: 'derecha', render: (l) => <span className="font-semibold text-slate-900">{formatearPrecio(l.monto)}</span> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Liquidaciones"
        descripcion="Pagos periódicos de ServiClean al personal por su saldo disponible. Un saldo negativo nunca se liquida."
        acciones={
          <Boton icono={<Sparkles className="h-4 w-4" />} onClick={() => setAccion({ tipo: 'generar' })} className="w-full sm:w-auto">
            Generar liquidaciones del periodo
          </Boton>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="w-full sm:w-72">
          <CampoSelect
            etiqueta="Trabajador"
            value={personalId}
            onChange={(e) => setPersonalId(e.target.value)}
            opciones={[{ valor: '', texto: 'Todo el personal' }, ...(personal ?? []).map((p) => ({ valor: p.id, texto: nombreCompleto(p) }))]}
          />
        </div>
        <FiltroFechas desde={rango.desde} hasta={rango.hasta} onCambiar={setRango} />
      </div>

      {cargando ? (
        <>
          <EsqueletoMetricas />
          <EsqueletoLista filas={5} />
        </>
      ) : error ? (
        <EstadoError mensaje={error} onReintentar={() => recargar()} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Metrica etiqueta="Total pagado" valor={formatearPrecio(suma(pagadas))} icono={CircleCheck} tono="exito" contexto={`${pagadas.length} liquidaciones pagadas`} />
            <Metrica etiqueta="Pendiente de pago" valor={formatearPrecio(suma(pendientes))} icono={Hourglass} tono="advertencia" contexto={`${pendientes.length} liquidaciones pendientes`} />
            <Metrica etiqueta="Liquidaciones" valor={liquidaciones.length} icono={Landmark} contexto="En el filtro actual" />
          </div>

          <FiltroSegmentado
            etiqueta="Filtrar por estado"
            valor={estado}
            onCambiar={setEstado}
            opciones={[
              { valor: 'TODAS', texto: 'Todas', total: liquidaciones.length },
              { valor: 'PENDIENTE', texto: 'Pendientes', total: pendientes.length },
              { valor: 'PAGADA', texto: 'Pagadas', total: pagadas.length },
              { valor: 'CANCELADA', texto: 'Canceladas', total: liquidaciones.filter((l) => l.estado === 'CANCELADA').length },
            ]}
          />

          {filtradas.length === 0 ? (
            <EstadoVacio icono={SearchX} titulo="Sin liquidaciones" descripcion="No hay liquidaciones que coincidan con los filtros." />
          ) : (
            <Tabla
              etiqueta="Liquidaciones"
              columnas={columnas}
              filas={filtradas}
              claveFila={(l) => l.id}
              onSeleccionar={setDetalle}
              resumenMovil={(l) => (
                <CeldaPrincipal icono={<Avatar usuario={l.wallet.personal} tamano="sm" />} titulo={nombreCompleto(l.wallet.personal)} subtitulo={referenciaLiquidacion(l.numero)} />
              )}
              destacadoMovil={(l) => <EstadoBadge tipo="liquidacion" estado={l.estado} />}
              acciones={(l) => (
                <>
                  {accionesFila(l)}
                  <Boton variante="fantasma" tamano="sm" icono={<Eye className="h-4 w-4" />} onClick={() => setDetalle(l)}>
                    Detalle
                  </Boton>
                </>
              )}
            />
          )}
        </>
      )}

      <DetalleLiquidacion
        liquidacionId={detalle?.id ?? null}
        onCerrar={() => setDetalle(null)}
        acciones={
          detalle?.estado === 'PENDIENTE' ? (
            <>
              <Boton variante="fantasmaPeligro" className="sm:mr-auto" icono={<XCircle className="h-4 w-4" />} onClick={() => setAccion({ tipo: 'cancelar', liquidacion: detalle })}>
                Cancelar liquidación
              </Boton>
              <Boton variante="exito" icono={<CircleCheck className="h-4 w-4" />} onClick={() => setAccion({ tipo: 'pagar', liquidacion: detalle })}>
                Marcar como pagada
              </Boton>
            </>
          ) : undefined
        }
      />

      <DialogoConfirmacion
        abierto={!!accion}
        peligroso={accion?.tipo === 'cancelar'}
        titulo={
          accion?.tipo === 'generar' ? '¿Generar liquidaciones del periodo?' : accion?.tipo === 'pagar' ? '¿Marcar como pagada?' : '¿Cancelar la liquidación?'
        }
        descripcion={
          accion?.tipo === 'generar'
            ? 'Se creará una liquidación pendiente para cada trabajador con saldo disponible y sin otra liquidación pendiente. Los saldos negativos no se liquidan.'
            : accion && (
                <>
                  {referenciaLiquidacion(accion.liquidacion.numero)} · {nombreCompleto(accion.liquidacion.wallet.personal)} ·{' '}
                  <strong className="font-semibold text-slate-700">{formatearPrecio(accion.liquidacion.monto)}</strong>.{' '}
                  {accion.tipo === 'pagar'
                    ? 'Confirma que ServiClean ya transfirió este dinero: se descontará de la wallet del trabajador.'
                    : 'Quedará en el historial como cancelada y no afectará la wallet.'}
                </>
              )
        }
        textoConfirmar={accion?.tipo === 'generar' ? 'Generar' : accion?.tipo === 'pagar' ? 'Marcar pagada' : 'Cancelar liquidación'}
        procesando={procesando}
        onConfirmar={ejecutar}
        onCancelar={() => setAccion(null)}
      />
    </div>
  );
}
