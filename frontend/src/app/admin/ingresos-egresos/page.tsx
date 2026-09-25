'use client';

import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Banknote, CreditCard, Landmark, Scale, SearchX } from 'lucide-react';
import Boton from '@/components/Boton';
import CampoSelect from '@/components/CampoSelect';
import CampoTexto from '@/components/CampoTexto';
import EncabezadoPagina from '@/components/EncabezadoPagina';
import { EsqueletoLista, EsqueletoMetricas } from '@/components/Esqueleto';
import EstadoBadge from '@/components/EstadoBadge';
import EstadoVacio, { EstadoError } from '@/components/EstadoVacio';
import FiltroFechas from '@/components/FiltroFechas';
import { FiltroSegmentado } from '@/components/Filtros';
import Metrica from '@/components/Metrica';
import Monto from '@/components/Monto';
import Tabla, { CeldaPrincipal, ColumnaTabla } from '@/components/Tabla';
import { FiltrosFlujo, reportesServicio } from '@/servicios/reportes.servicio';
import { usuariosServicio } from '@/servicios/usuarios.servicio';
import { MetodoPago, MovimientoFlujo } from '@/tipos';
import { TEXTO_METODO_PAGO } from '@/utilidades/estados';
import { formatearFechaHora, formatearPrecio, nombreCompleto } from '@/utilidades/formato';
import { useCarga } from '@/utilidades/useCarga';

type Tipo = 'TODOS' | 'INGRESO' | 'EGRESO';

const ESTADOS = [
  { valor: '', texto: 'Estados por defecto' },
  { valor: 'PAGADO', texto: 'Pago: pagado' },
  { valor: 'REEMBOLSADO', texto: 'Pago: reembolsado' },
  { valor: 'PENDIENTE', texto: 'Pendiente' },
  { valor: 'PAGADA', texto: 'Liquidación: pagada' },
  { valor: 'CANCELADA', texto: 'Liquidación: cancelada' },
];

export default function IngresosEgresos() {
  const [tipo, setTipo] = useState<Tipo>('TODOS');
  const [rango, setRango] = useState({ desde: '', hasta: '' });
  const [metodo, setMetodo] = useState('');
  const [estado, setEstado] = useState('');
  const [personalId, setPersonalId] = useState('');
  const [solicitud, setSolicitud] = useState('');

  const { datos: personal } = useCarga(() => usuariosServicio.listar('PERSONAL_ASEO'));
  const filtros: FiltrosFlujo = {
    ...rango,
    tipo: tipo === 'TODOS' ? undefined : tipo,
    metodo: (metodo || undefined) as MetodoPago | undefined,
    estado: (estado || undefined) as FiltrosFlujo['estado'],
    personalId: personalId || undefined,
  };
  const { datos, cargando, error, recargar } = useCarga(
    () => reportesServicio.flujo(filtros),
    [tipo, rango.desde, rango.hasta, metodo, estado, personalId],
  );

  // El filtro por solicitud acepta el id completo o la referencia corta (#AB12CD).
  const movimientos = useMemo(() => {
    const termino = solicitud.replace('#', '').trim().toLowerCase();
    return (datos?.movimientos ?? []).filter(
      (m) => !termino || (m.solicitudId && m.solicitudId.replace(/-/g, '').toLowerCase().startsWith(termino.replace(/-/g, ''))),
    );
  }, [datos, solicitud]);

  const hayFiltros = Boolean(rango.desde || rango.hasta || metodo || estado || personalId || solicitud || tipo !== 'TODOS');
  const limpiar = () => {
    setTipo('TODOS');
    setRango({ desde: '', hasta: '' });
    setMetodo('');
    setEstado('');
    setPersonalId('');
    setSolicitud('');
  };

  const columnas: ColumnaTabla<MovimientoFlujo>[] = [
    { clave: 'fecha', titulo: 'Fecha', ocultarEnMovil: true, render: (m) => formatearFechaHora(m.fecha) },
    {
      clave: 'concepto',
      titulo: 'Concepto',
      ocultarEnMovil: true,
      render: (m) => (
        <CeldaPrincipal
          icono={
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${m.tipo === 'INGRESO' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
              {m.tipo === 'INGRESO' ? <ArrowUpRight className="h-4 w-4" aria-hidden /> : <ArrowDownLeft className="h-4 w-4" aria-hidden />}
            </span>
          }
          titulo={m.concepto}
          subtitulo={m.detalle}
        />
      ),
    },
    { clave: 'referencia', titulo: 'Referencia', render: (m) => <span className="font-mono text-[13px]">{m.referencia}</span> },
    { clave: 'metodo', titulo: 'Método', render: (m) => (m.metodo ? TEXTO_METODO_PAGO[m.metodo] : 'Transferencia al personal') },
    { clave: 'personal', titulo: 'Trabajador', render: (m) => nombreCompleto(m.personal) || '—' },
    {
      clave: 'estado',
      titulo: 'Estado',
      render: (m) => <EstadoBadge tipo={m.tipo === 'INGRESO' ? 'pago' : 'liquidacion'} estado={m.estado} />,
    },
    {
      clave: 'monto',
      titulo: 'Monto',
      alineacion: 'derecha',
      render: (m) =>
        m.tipo === 'INGRESO' && !m.recibidoPorPlataforma ? (
          <span className="font-semibold text-amber-700 cifras" title="Cobrado en efectivo por el personal">
            {formatearPrecio(m.monto)}
          </span>
        ) : (
          <Monto valor={m.monto} />
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Ingresos y egresos"
        descripcion="Pagos de servicios recibidos y liquidaciones pagadas al personal. Los pagos en efectivo se muestran aparte porque los recibe directamente el trabajador."
      />

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-suave sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <FiltroSegmentado
            etiqueta="Tipo de movimiento"
            valor={tipo}
            onCambiar={setTipo}
            opciones={[
              { valor: 'TODOS', texto: 'Todos' },
              { valor: 'INGRESO', texto: 'Ingresos' },
              { valor: 'EGRESO', texto: 'Egresos' },
            ]}
          />
          <FiltroFechas desde={rango.desde} hasta={rango.hasta} onCambiar={setRango} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CampoSelect
            etiqueta="Método de pago"
            value={metodo}
            onChange={(e) => setMetodo(e.target.value)}
            opciones={[
              { valor: '', texto: 'Todos los métodos' },
              { valor: 'SIMULADO_TARJETA', texto: 'Tarjeta (simulada)' },
              { valor: 'EFECTIVO', texto: 'Efectivo' },
              { valor: 'NEQUI', texto: 'Nequi (histórico)' },
              { valor: 'TRANSFERENCIA', texto: 'Transferencia (histórico)' },
            ]}
          />
          <CampoSelect etiqueta="Estado" value={estado} onChange={(e) => setEstado(e.target.value)} opciones={ESTADOS} />
          <CampoSelect
            etiqueta="Trabajador"
            value={personalId}
            onChange={(e) => setPersonalId(e.target.value)}
            opciones={[{ valor: '', texto: 'Todo el personal' }, ...(personal ?? []).map((p) => ({ valor: p.id, texto: nombreCompleto(p) }))]}
          />
          <CampoTexto etiqueta="Solicitud" placeholder="#AB12CD" value={solicitud} onChange={(e) => setSolicitud(e.target.value)} />
        </div>
        {hayFiltros && (
          <div>
            <Boton variante="fantasma" tamano="sm" onClick={limpiar}>
              Limpiar filtros
            </Boton>
          </div>
        )}
      </div>

      {cargando ? (
        <>
          <EsqueletoMetricas cantidad={4} />
          <EsqueletoLista filas={6} />
        </>
      ) : error || !datos ? (
        <EstadoError mensaje={error} onReintentar={() => recargar()} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metrica etiqueta="Ingresos de la plataforma" valor={formatearPrecio(datos.totales.ingresosPlataforma)} icono={CreditCard} tono="exito" contexto="Pagos recibidos por ServiClean" />
            <Metrica etiqueta="Efectivo del personal" valor={formatearPrecio(datos.totales.efectivoPersonal)} icono={Banknote} tono="advertencia" contexto="No entra a la caja de ServiClean" />
            <Metrica etiqueta="Egresos" valor={formatearPrecio(datos.totales.egresos)} icono={Landmark} tono="peligro" contexto="Liquidaciones pagadas" />
            <Metrica etiqueta="Neto en caja" valor={formatearPrecio(datos.totales.neto)} icono={Scale} tono="marca" contexto="Ingresos de la plataforma − egresos" />
          </div>

          {movimientos.length === 0 ? (
            <EstadoVacio icono={SearchX} titulo="Sin movimientos" descripcion="No hay ingresos ni egresos que coincidan con los filtros." />
          ) : (
            <Tabla
              etiqueta="Ingresos y egresos"
              columnas={columnas}
              filas={movimientos}
              claveFila={(m) => `${m.tipo}-${m.id}`}
              resumenMovil={(m) => <CeldaPrincipal titulo={m.concepto} subtitulo={`${formatearFechaHora(m.fecha)} · ${m.detalle}`} />}
            />
          )}
        </>
      )}
    </div>
  );
}
