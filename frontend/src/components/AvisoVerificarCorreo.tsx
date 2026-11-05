'use client';

import { useState } from 'react';
import { MailCheck } from 'lucide-react';
import Alerta from '@/components/Alerta';
import Boton from '@/components/Boton';
import { authServicio } from '@/servicios/auth.servicio';
import { mensajeError } from '@/utilidades/errores';

/** Indica que se envió el enlace de verificación y permite pedir uno nuevo. */
export default function AvisoVerificarCorreo({ correo, onVolver }: { correo: string; onVolver?: () => void }) {
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const reenviar = async () => {
    setError('');
    setMensaje('');
    setCargando(true);
    try {
      const resultado = await authServicio.reenviarVerificacion(correo);
      setMensaje(resultado.mensaje);
    } catch (excepcion) {
      setError(mensajeError(excepcion, 'No fue posible reenviar el enlace.'));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50/60 px-6 py-8 text-center" role="status">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100">
        <MailCheck className="h-7 w-7" aria-hidden />
      </span>
      <p className="mt-5 text-[15px] leading-relaxed text-slate-700">
        Enviamos un enlace de verificación a <span className="font-semibold text-slate-900">{correo}</span>.
      </p>
      <p className="mt-2 text-sm text-slate-500">Ábrelo para activar tu cuenta. Si no lo ves, revisa la carpeta de spam.</p>

      {mensaje && <Alerta tipo="exito" mensaje={mensaje} className="mt-5 w-full text-left" />}
      {error && <Alerta tipo="error" mensaje={error} className="mt-5 w-full text-left" />}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Boton type="button" variante="secundario" tamano="sm" cargando={cargando} onClick={reenviar}>
          {cargando ? 'Enviando…' : 'Reenviar enlace'}
        </Boton>
        {onVolver && (
          <Boton type="button" variante="fantasma" tamano="sm" onClick={onVolver}>
            Usar otro correo
          </Boton>
        )}
      </div>
    </div>
  );
}
