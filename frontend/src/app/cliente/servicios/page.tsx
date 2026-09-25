'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, Clock, SearchX, Sparkles } from 'lucide-react';
import { clasesBoton } from '@/components/Boton';
import EncabezadoPagina from '@/components/EncabezadoPagina';
import { EsqueletoTarjetas } from '@/components/Esqueleto';
import EstadoVacio, { EstadoError } from '@/components/EstadoVacio';
import { CampoBusqueda } from '@/components/Filtros';
import IconoServicio from '@/components/IconoServicio';
import { serviciosServicio } from '@/servicios/servicios.servicio';
import { coincideBusqueda, formatearDuracion, formatearPrecio } from '@/utilidades/formato';
import { useCarga } from '@/utilidades/useCarga';

export default function CatalogoServicios() {
  const { datos: servicios, cargando, error, recargar } = useCarga(() => serviciosServicio.listar());
  const [busqueda, setBusqueda] = useState('');

  const filtrados = useMemo(
    () => (servicios ?? []).filter((servicio) => coincideBusqueda(busqueda, servicio.nombre, servicio.descripcion)),
    [servicios, busqueda],
  );

  return (
    <div className="flex flex-col gap-8">
      <EncabezadoPagina
        titulo="Catálogo de servicios"
        descripcion="Elige el servicio que necesitas. Verás el precio base y la duración estimada antes de agendar."
        acciones={servicios && servicios.length > 4 ? <CampoBusqueda valor={busqueda} onCambiar={setBusqueda} placeholder="Buscar servicio" /> : undefined}
      />

      {cargando ? (
        <EsqueletoTarjetas />
      ) : error ? (
        <EstadoError mensaje={error} onReintentar={() => recargar()} />
      ) : !servicios || servicios.length === 0 ? (
        <EstadoVacio
          icono={Sparkles}
          titulo="Aún no hay servicios disponibles"
          descripcion="Pronto encontrarás aquí las opciones de limpieza. Vuelve a intentarlo más tarde."
        />
      ) : filtrados.length === 0 ? (
        <EstadoVacio
          icono={SearchX}
          titulo="Sin resultados"
          descripcion={`No encontramos servicios que coincidan con “${busqueda}”.`}
          accion={
            <button type="button" onClick={() => setBusqueda('')} className={clasesBoton('contorno', 'sm')}>
              Limpiar búsqueda
            </button>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((servicio, indice) => (
            <li
              key={servicio.id}
              className="animate-aparecer"
              style={{ animationDelay: `${Math.min(indice, 8) * 40}ms` }}
            >
              <Link
                href={`/cliente/servicios/${servicio.id}`}
                className="group flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-suave transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-marca-200 hover:shadow-elevada"
              >
                <div className="flex items-start justify-between gap-3">
                  <IconoServicio icono={servicio.icono} tamano="lg" />
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    <Clock className="h-3.5 w-3.5" aria-hidden />
                    {formatearDuracion(servicio.duracionMinutos)} aprox.
                  </span>
                </div>
                <h2 className="mt-5 text-lg font-semibold text-slate-900">{servicio.nombre}</h2>
                <p className="mt-2 line-clamp-3 flex-1 text-[15px] leading-relaxed text-slate-500">{servicio.descripcion}</p>
                <div className="mt-6 flex items-end justify-between gap-3 border-t border-slate-100 pt-5">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Precio base</p>
                    <p className="font-display text-xl font-bold text-slate-900 cifras">{formatearPrecio(servicio.precioBase)}</p>
                  </div>
                  <span className={clasesBoton('secundario', 'sm', 'group-hover:bg-marca-600 group-hover:text-white')}>
                    Solicitar
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
