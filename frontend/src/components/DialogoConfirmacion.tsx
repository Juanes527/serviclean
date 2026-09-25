'use client';

import { ReactNode } from 'react';
import { CircleHelp, TriangleAlert } from 'lucide-react';
import Boton from './Boton';
import Modal from './Modal';

interface PropiedadesDialogoConfirmacion {
  abierto: boolean;
  titulo: string;
  descripcion: ReactNode;
  textoConfirmar: string;
  textoCancelar?: string;
  peligroso?: boolean;
  procesando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

/** Confirmación previa a acciones destructivas o difíciles de revertir. */
export default function DialogoConfirmacion({
  abierto,
  titulo,
  descripcion,
  textoConfirmar,
  textoCancelar = 'Volver',
  peligroso = false,
  procesando = false,
  onConfirmar,
  onCancelar,
}: PropiedadesDialogoConfirmacion) {
  const Icono = peligroso ? TriangleAlert : CircleHelp;
  return (
    <Modal
      abierto={abierto}
      titulo={titulo}
      descripcion={descripcion}
      onCerrar={procesando ? () => undefined : onCancelar}
      tamano="sm"
      icono={
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-full ${
            peligroso ? 'bg-red-50 text-red-600' : 'bg-marca-50 text-marca-600'
          }`}
        >
          <Icono className="h-5 w-5" aria-hidden />
        </span>
      }
      pie={
        <>
          <Boton variante="contorno" onClick={onCancelar} disabled={procesando} data-autofocus>
            {textoCancelar}
          </Boton>
          <Boton variante={peligroso ? 'peligro' : 'primario'} onClick={onConfirmar} cargando={procesando}>
            {textoConfirmar}
          </Boton>
        </>
      }
    />
  );
}
