'use client';

import { CalendarDays, MapPin, Phone } from 'lucide-react';
import AccionAsignacion from '@/components/AccionAsignacion';
import AgendaLista from '@/components/AgendaLista';
import EncabezadoPagina from '@/components/EncabezadoPagina';
import { Esqueleto, EsqueletoLista } from '@/components/Esqueleto';
import EstadoVacio, { EstadoError } from '@/components/EstadoVacio';
import { agendaServicio } from '@/servicios/agenda.servicio';
import { useCarga } from '@/utilidades/useCarga';

export default function AgendaPersonal() {
  const { datos: asignaciones, cargando, error, recargar } = useCarga(() => agendaServicio.agendaPersonal());

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Mi agenda" descripcion="Tus servicios programados, en orden cronológico." />

      {cargando ? (
        <div className="flex flex-col gap-6" role="status" aria-label="Cargando agenda">
          <Esqueleto className="h-24 rounded-2xl" />
          <EsqueletoLista filas={3} />
        </div>
      ) : error ? (
        <EstadoError mensaje={error} onReintentar={() => recargar()} />
      ) : !asignaciones || asignaciones.length === 0 ? (
        <EstadoVacio
          icono={CalendarDays}
          titulo="No tienes servicios programados"
          descripcion="Los servicios que aceptes aparecerán aquí organizados por día."
        />
      ) : (
        <AgendaLista
          elementos={asignaciones.map((asignacion) => ({
            id: asignacion.id,
            fecha: asignacion.solicitud.fecha,
            hora: asignacion.solicitud.hora,
            titulo: asignacion.solicitud.servicio.nombre,
            icono: asignacion.solicitud.servicio.icono,
            estado: asignacion.solicitud.estado,
            detalles: [
              { icono: MapPin, texto: asignacion.solicitud.direccion },
              {
                icono: Phone,
                texto: (
                  <a href={`tel:${asignacion.solicitud.telefono.replace(/\s/g, '')}`} className="font-medium text-marca-700 hover:underline">
                    {asignacion.solicitud.telefono}
                  </a>
                ),
              },
            ],
            persona: { etiqueta: 'Cliente', usuario: asignacion.solicitud.cliente },
            acciones: <AccionAsignacion asignacion={asignacion} onActualizado={() => recargar(true)} />,
          }))}
        />
      )}
    </div>
  );
}
