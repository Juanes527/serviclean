'use client';

import Link from 'next/link';
import { CalendarDays, MapPin, Plus } from 'lucide-react';
import AgendaLista from '@/components/AgendaLista';
import { clasesBoton } from '@/components/Boton';
import EncabezadoPagina from '@/components/EncabezadoPagina';
import { EsqueletoLista, Esqueleto } from '@/components/Esqueleto';
import EstadoVacio, { EstadoError } from '@/components/EstadoVacio';
import { agendaServicio } from '@/servicios/agenda.servicio';
import { useCarga } from '@/utilidades/useCarga';

export default function AgendaCliente() {
  const { datos: solicitudes, cargando, error, recargar } = useCarga(() => agendaServicio.agendaCliente());

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Mi agenda"
        descripcion="Tus servicios programados, organizados por día."
        acciones={
          <Link href="/cliente/servicios" className={clasesBoton('contorno', 'md', 'w-full sm:w-auto')}>
            <Plus className="h-4 w-4" aria-hidden />
            Agendar servicio
          </Link>
        }
      />

      {cargando ? (
        <div className="flex flex-col gap-6" role="status" aria-label="Cargando agenda">
          <Esqueleto className="h-24 rounded-2xl" />
          <EsqueletoLista filas={3} />
        </div>
      ) : error ? (
        <EstadoError mensaje={error} onReintentar={() => recargar()} />
      ) : !solicitudes || solicitudes.length === 0 ? (
        <EstadoVacio
          icono={CalendarDays}
          titulo="No tienes servicios programados"
          descripcion="Los servicios asignados, aceptados o en proceso aparecerán aquí."
          accion={
            <Link href="/cliente/servicios" className={clasesBoton('primario', 'sm')}>
              Solicitar servicio
            </Link>
          }
        />
      ) : (
        <AgendaLista
          elementos={solicitudes.map((solicitud) => ({
            id: solicitud.id,
            fecha: solicitud.fecha,
            hora: solicitud.hora,
            titulo: solicitud.servicio.nombre,
            icono: solicitud.servicio.icono,
            estado: solicitud.estado,
            detalles: [{ icono: MapPin, texto: solicitud.direccion }],
            persona: { etiqueta: 'Personal asignado', usuario: solicitud.asignacion?.personal },
          }))}
        />
      )}
    </div>
  );
}
