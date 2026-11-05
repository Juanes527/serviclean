'use client';

import { useState } from 'react';
import { CircleCheck, HandCoins, Play, ThumbsUp } from 'lucide-react';
import { AsignacionConSolicitud, asignacionesServicio } from '@/servicios/asignaciones.servicio';
import { pagosServicio } from '@/servicios/pagos.servicio';
import { solicitudesServicio } from '@/servicios/solicitudes.servicio';
import { formatearPrecio } from '@/utilidades/formato';
import { mensajeError } from '@/utilidades/errores';
import { useAvisos } from './Avisos';
import Boton, { TamanoBoton } from './Boton';
import DialogoConfirmacion from './DialogoConfirmacion';

/**
 * Siguiente acción que el personal de aseo puede ejecutar sobre un servicio:
 * aceptar (ASIGNADO), iniciar (ACEPTADO) o finalizar (EN_PROCESO).
 */
export default function AccionAsignacion({
  asignacion,
  onActualizado,
  tamano = 'sm',
}: {
  asignacion: AsignacionConSolicitud;
  onActualizado: () => void;
  tamano?: TamanoBoton;
}) {
  const { avisar } = useAvisos();
  const [procesando, setProcesando] = useState(false);
  const [confirmarFin, setConfirmarFin] = useState(false);
  const [confirmarEfectivo, setConfirmarEfectivo] = useState(false);
  const { solicitud } = asignacion;

  const ejecutar = async (accion: () => Promise<unknown>, exito: string) => {
    setProcesando(true);
    try {
      await accion();
      avisar({ tipo: 'exito', titulo: exito, descripcion: solicitud.servicio.nombre });
      setConfirmarFin(false);
      setConfirmarEfectivo(false);
      onActualizado();
    } catch (excepcion) {
      avisar({ tipo: 'error', titulo: 'No se pudo actualizar el servicio', descripcion: mensajeError(excepcion, 'Inténtalo de nuevo.') });
    } finally {
      setProcesando(false);
    }
  };

  if (solicitud.estado === 'ASIGNADO') {
    return (
      <Boton
        tamano={tamano}
        cargando={procesando}
        icono={<ThumbsUp className="h-4 w-4" />}
        onClick={() => ejecutar(() => asignacionesServicio.aceptar(asignacion.id), 'Servicio aceptado')}
      >
        Aceptar servicio
      </Boton>
    );
  }

  if (solicitud.estado === 'ACEPTADO') {
    return (
      <Boton
        tamano={tamano}
        variante="secundario"
        cargando={procesando}
        icono={<Play className="h-4 w-4" />}
        onClick={() => ejecutar(() => solicitudesServicio.actualizarEstado(solicitud.id, 'EN_PROCESO'), 'Servicio iniciado')}
      >
        Iniciar servicio
      </Boton>
    );
  }

  // Efectivo: el personal marca el pago como recibido durante o después del servicio.
  const pendienteEfectivo =
    ['EN_PROCESO', 'FINALIZADO'].includes(solicitud.estado) &&
    (solicitud.pago?.metodo ?? solicitud.metodoPago) === 'EFECTIVO' &&
    (!solicitud.pago || solicitud.pago.estado === 'PENDIENTE');
  const botonEfectivo = pendienteEfectivo && (
    <>
      <Boton tamano={tamano} variante="secundario" icono={<HandCoins className="h-4 w-4" />} onClick={() => setConfirmarEfectivo(true)}>
        Marcar efectivo recibido
      </Boton>
      <DialogoConfirmacion
        abierto={confirmarEfectivo}
        titulo="¿Recibiste el pago en efectivo?"
        descripcion={`Confirma que el cliente te entregó ${formatearPrecio(solicitud.servicio.precioBase)} en efectivo. Esta acción no se puede deshacer.`}
        textoConfirmar="Sí, lo recibí"
        procesando={procesando}
        onConfirmar={() => ejecutar(() => pagosServicio.confirmarEfectivoRecibido(solicitud.id), 'Pago en efectivo confirmado')}
        onCancelar={() => setConfirmarEfectivo(false)}
      />
    </>
  );

  if (solicitud.estado === 'FINALIZADO') {
    return botonEfectivo || null;
  }

  if (solicitud.estado === 'EN_PROCESO') {
    return (
      <div className="flex flex-wrap gap-2">
        {botonEfectivo}
        <Boton tamano={tamano} variante="exito" icono={<CircleCheck className="h-4 w-4" />} onClick={() => setConfirmarFin(true)}>
          Finalizar servicio
        </Boton>
        <DialogoConfirmacion
          abierto={confirmarFin}
          titulo="¿Finalizar este servicio?"
          descripcion="Confirma que terminaste el trabajo. Se notificará al cliente para que pueda calificarlo."
          textoConfirmar="Sí, finalizar"
          procesando={procesando}
          onConfirmar={() => ejecutar(() => solicitudesServicio.actualizarEstado(solicitud.id, 'FINALIZADO'), 'Servicio finalizado')}
          onCancelar={() => setConfirmarFin(false)}
        />
      </div>
    );
  }

  return null;
}
