'use client';

import { useEffect, useState } from 'react';
import { calificacionesServicio } from '@/servicios/calificaciones.servicio';
import { Solicitud } from '@/tipos';
import { mensajeError } from '@/utilidades/errores';
import { nombreCompleto } from '@/utilidades/formato';
import Alerta from './Alerta';
import Avatar from './Avatar';
import { useAvisos } from './Avisos';
import Boton from './Boton';
import CampoTextarea from './CampoTextarea';
import { SelectorEstrellas } from './Estrellas';
import Modal from './Modal';

/** Calificación de un servicio finalizado por parte del cliente. */
export default function ModalCalificacion({
  solicitud,
  onCerrar,
  onCalificado,
}: {
  solicitud: Solicitud | null;
  onCerrar: () => void;
  onCalificado: () => void;
}) {
  const { avisar } = useAvisos();
  const [puntuacion, setPuntuacion] = useState(0);
  const [comentario, setComentario] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!solicitud) return;
    setPuntuacion(0);
    setComentario('');
    setError('');
  }, [solicitud]);

  const calificar = async () => {
    if (!solicitud || puntuacion === 0) return;
    setProcesando(true);
    setError('');
    try {
      await calificacionesServicio.crear(solicitud.id, puntuacion, comentario);
      avisar({ tipo: 'exito', titulo: '¡Gracias por tu calificación!', descripcion: 'Tu opinión nos ayuda a mejorar el servicio.' });
      onCerrar();
      onCalificado();
    } catch (excepcion) {
      setError(mensajeError(excepcion, 'No fue posible registrar la calificación.'));
    } finally {
      setProcesando(false);
    }
  };

  return (
    <Modal
      abierto={!!solicitud}
      titulo="¿Cómo fue tu servicio?"
      onCerrar={onCerrar}
      pie={
        <>
          <Boton variante="contorno" onClick={onCerrar} disabled={procesando}>
            Ahora no
          </Boton>
          <Boton onClick={calificar} cargando={procesando} disabled={puntuacion === 0}>
            Enviar calificación
          </Boton>
        </>
      }
    >
      {solicitud && (
        <div className="flex flex-col gap-6">
          {error && <Alerta tipo="error" mensaje={error} />}
          <div className="flex flex-col items-center text-center">
            {solicitud.asignacion?.personal ? (
              <>
                <Avatar usuario={solicitud.asignacion.personal} tamano="lg" />
                <p className="mt-3 text-sm text-slate-500">
                  Tu servicio de <span className="font-medium text-slate-700">{solicitud.servicio.nombre.toLowerCase()}</span> con
                </p>
                <p className="font-display text-lg font-bold text-slate-900">{nombreCompleto(solicitud.asignacion.personal)}</p>
              </>
            ) : (
              <p className="font-display text-lg font-bold text-slate-900">{solicitud.servicio.nombre}</p>
            )}
          </div>
          <SelectorEstrellas valor={puntuacion} onCambiar={setPuntuacion} />
          <CampoTextarea
            etiqueta="Cuéntanos más (opcional)"
            placeholder="¿Qué te gustó? ¿Qué podríamos mejorar?"
            value={comentario}
            onChange={(evento) => setComentario(evento.target.value)}
          />
        </div>
      )}
    </Modal>
  );
}
