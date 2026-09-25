'use client';

import { useMemo, useState } from 'react';
import { Banknote, Building2, CircleCheck, CreditCard, SearchX, Wallet } from 'lucide-react';
import { useAvisos } from '@/components/Avisos';
import Boton from '@/components/Boton';
import CampoSelect from '@/components/CampoSelect';
import DialogoConfirmacion from '@/components/DialogoConfirmacion';
import EncabezadoPagina from '@/components/EncabezadoPagina';
import { EsqueletoLista, EsqueletoMetricas } from '@/components/Esqueleto';
import EstadoBadge from '@/components/EstadoBadge';
import EstadoVacio, { EstadoError } from '@/components/EstadoVacio';
import FiltroFechas from '@/components/FiltroFechas';
import { CampoBusqueda, FiltroSegmentado } from '@/components/Filtros';
import MetodoPagoTexto from '@/components/MetodoPagoTexto';
import Metrica from '@/components/Metrica';
import Tabla, { CeldaPrincipal, ColumnaTabla } from '@/components/Tabla';
import { pagosServicio } from '@/servicios/pagos.servicio';
import { EstadoPago, MetodoPago, Pago } from '@/tipos';
import { mensajeError } from '@/utilidades/errores';
import { TEXTO_METODO_PAGO } from '@/utilidades/estados';
import { coincideBusqueda, formatearFechaHora, formatearPrecio, nombreCompleto, referenciaServicio } from '@/utilidades/formato';
import { useCarga } from '@/utilidades/useCarga';

type Filtro = 'TODOS' | EstadoPago;

export default function PagosAdmin() {
  const { avisar } = useAvisos();
  const [rango, setRango] = useState({ desde: '', hasta: '' });
  const [metodo, setMetodo] = useState('');
  const { datos, cargando, error, recargar } = useCarga(
    () => pagosServicio.listarTodos({ ...rango, metodo: (metodo || undefined) as MetodoPago | undefined }),
    [rango.desde, rango.hasta, metodo],
  );
  const pagos = useMemo(() => datos ?? [], [datos]);
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [accion, setAccion] = useState<{ pago: Pago; estado: 'PAGADO' | 'CANCELADO' } | null>(null);
  const [procesando, setProcesando] = useState(false);

  const suma = (lista: Pago[], campo: 'monto' | 'montoComision' = 'monto') => lista.reduce((total, pago) => total + Number(pago[campo] ?? 0), 0);
  const pagados = pagos.filter((pago) => pago.estado === 'PAGADO');
  const plataforma = pagados.filter((pago) => pago.metodo !== 'EFECTIVO');
  const efectivo = pagados.filter((pago) => pago.metodo === 'EFECTIVO');
  const pendientes = pagos.filter((pago) => pago.estado === 'PENDIENTE');

  const filtrados = pagos
    .filter((pago) => filtro === 'TODOS' || pago.estado === filtro)
    .filter((pago) =>
      coincideBusqueda(
        busqueda,
        nombreCompleto(pago.cliente),
        pago.solicitud?.servicio.nombre,
        pago.referencia,
        referenciaServicio(pago.solicitudId),
        nombreCompleto(pago.solicitud?.asignacion?.personal),
      ),
    );

  const actualizarEstado = async () => {
    if (!accion) return;
    setProcesando(true);
    try {
      await pagosServicio.actualizarEstado(accion.pago.id, accion.estado);
      avisar({
        tipo: 'exito',
        titulo: accion.estado === 'PAGADO' ? 'Pago confirmado' : 'Pago rechazado',
        descripcion: `${nombreCompleto(accion.pago.cliente)} · ${formatearPrecio(accion.pago.monto)}`,
      });
      setAccion(null);
      await recargar(true);
    } catch (excepcion) {
      avisar({ tipo: 'error', titulo: 'No se pudo actualizar el pago', descripcion: mensajeError(excepcion, 'Inténtalo de nuevo.') });
    } finally {
      setProcesando(false);
    }
  };

  const columnas: ColumnaTabla<Pago>[] = [
    {
      clave: 'cliente',
      titulo: 'Cliente',
      ocultarEnMovil: true,
      render: (pago) => (
        <CeldaPrincipal
          titulo={nombreCompleto(pago.cliente)}
          subtitulo={`${pago.solicitud?.servicio.nombre ?? ''} · ${referenciaServicio(pago.solicitudId)}`}
        />
      ),
    },
    { clave: 'referencia', titulo: 'Referencia', render: (pago) => <span className="font-mono text-[13px]">{pago.referencia}</span> },
    { clave: 'metodo', titulo: 'Método', render: (pago) => <MetodoPagoTexto pago={pago} /> },
    { clave: 'personal', titulo: 'Personal', render: (pago) => nombreCompleto(pago.solicitud?.asignacion?.personal) || <span className="text-slate-400">Sin asignar</span> },
    { clave: 'fecha', titulo: 'Registrado', render: (pago) => formatearFechaHora(pago.fecha) },
    { clave: 'estado', titulo: 'Estado', ocultarEnMovil: true, render: (pago) => <EstadoBadge tipo="pago" estado={pago.estado} /> },
    {
      clave: 'comision',
      titulo: 'Comisión',
      alineacion: 'derecha',
      render: (pago) => (pago.montoComision !== null ? formatearPrecio(pago.montoComision) : <span className="text-slate-400">—</span>),
    },
    {
      clave: 'monto',
      titulo: 'Monto',
      alineacion: 'derecha',
      render: (pago) => <span className="font-semibold text-slate-900">{formatearPrecio(pago.monto)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Pagos"
        descripcion="Pagos de los servicios. Los pagos con tarjeta son simulados (no hay cobros reales); los pagos en efectivo los recibe directamente el personal."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="w-full sm:w-64">
          <CampoSelect
            etiqueta="Método de pago"
            value={metodo}
            onChange={(e) => setMetodo(e.target.value)}
            opciones={[{ valor: '', texto: 'Todos los métodos' }, ...(Object.keys(TEXTO_METODO_PAGO) as MetodoPago[]).map((m) => ({ valor: m, texto: TEXTO_METODO_PAGO[m] }))]}
          />
        </div>
        <FiltroFechas desde={rango.desde} hasta={rango.hasta} onCambiar={setRango} />
      </div>

      {cargando ? (
        <>
          <EsqueletoMetricas cantidad={4} />
          <EsqueletoLista filas={5} />
        </>
      ) : error ? (
        <EstadoError mensaje={error} onReintentar={() => recargar()} />
      ) : pagos.length === 0 ? (
        <EstadoVacio icono={Wallet} titulo="No hay pagos registrados" descripcion="Los pagos que realicen los clientes aparecerán aquí." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metrica etiqueta="Recibido por la plataforma" valor={formatearPrecio(suma(plataforma))} icono={CreditCard} tono="info" contexto={`${plataforma.length} pagos con tarjeta simulada`} />
            <Metrica etiqueta="Pagado en efectivo al personal" valor={formatearPrecio(suma(efectivo))} icono={Banknote} tono="advertencia" contexto={`${efectivo.length} pagos en efectivo`} />
            <Metrica etiqueta="Comisión ServiClean" valor={formatearPrecio(suma(pagados, 'montoComision'))} icono={Building2} tono="marca" contexto="Sobre pagos confirmados" />
            <Metrica etiqueta="Total de servicios pagados" valor={formatearPrecio(suma(pagados))} icono={CircleCheck} tono="exito" contexto={`${pagados.length} pagos confirmados`} />
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <FiltroSegmentado
              etiqueta="Filtrar pagos"
              valor={filtro}
              onCambiar={setFiltro}
              opciones={[
                { valor: 'TODOS', texto: 'Todos', total: pagos.length },
                { valor: 'PAGADO', texto: 'Pagados', total: pagados.length },
                { valor: 'REEMBOLSADO', texto: 'Reembolsados', total: pagos.filter((p) => p.estado === 'REEMBOLSADO').length },
                ...(pendientes.length > 0 ? [{ valor: 'PENDIENTE' as Filtro, texto: 'Por verificar', total: pendientes.length }] : []),
                { valor: 'CANCELADO', texto: 'Cancelados', total: pagos.filter((p) => p.estado === 'CANCELADO').length },
              ]}
            />
            <CampoBusqueda valor={busqueda} onCambiar={setBusqueda} placeholder="Cliente, referencia o servicio" />
          </div>

          {filtrados.length === 0 ? (
            <EstadoVacio icono={SearchX} titulo="Sin resultados" descripcion="No hay pagos que coincidan con los filtros." />
          ) : (
            <Tabla
              etiqueta="Pagos registrados"
              columnas={columnas}
              filas={filtrados}
              claveFila={(pago) => pago.id}
              resumenMovil={(pago) => <CeldaPrincipal titulo={nombreCompleto(pago.cliente)} subtitulo={pago.solicitud?.servicio.nombre} />}
              destacadoMovil={(pago) => <EstadoBadge tipo="pago" estado={pago.estado} />}
              acciones={(pago) =>
                // Solo pagos históricos (Nequi / transferencia) pueden quedar pendientes de verificación.
                pago.estado === 'PENDIENTE' ? (
                  <>
                    <Boton variante="exito" tamano="sm" icono={<CircleCheck className="h-4 w-4" />} onClick={() => setAccion({ pago, estado: 'PAGADO' })}>
                      Confirmar
                    </Boton>
                    <Boton variante="fantasmaPeligro" tamano="sm" onClick={() => setAccion({ pago, estado: 'CANCELADO' })}>
                      Rechazar
                    </Boton>
                  </>
                ) : null
              }
            />
          )}
        </>
      )}

      <DialogoConfirmacion
        abierto={!!accion}
        peligroso={accion?.estado === 'CANCELADO'}
        titulo={accion?.estado === 'PAGADO' ? '¿Confirmar este pago?' : '¿Rechazar este pago?'}
        descripcion={
          accion && (
            <>
              {nombreCompleto(accion.pago.cliente)} · <strong className="font-semibold text-slate-700">{formatearPrecio(accion.pago.monto)}</strong> por{' '}
              {TEXTO_METODO_PAGO[accion.pago.metodo].toLowerCase()}.{' '}
              {accion.estado === 'PAGADO'
                ? 'Se registrará la comisión y, si el servicio ya finalizó, se acreditará la parte del personal.'
                : 'El pago quedará marcado como cancelado.'}
            </>
          )
        }
        textoConfirmar={accion?.estado === 'PAGADO' ? 'Confirmar pago' : 'Rechazar pago'}
        procesando={procesando}
        onConfirmar={actualizarEstado}
        onCancelar={() => setAccion(null)}
      />
    </div>
  );
}
