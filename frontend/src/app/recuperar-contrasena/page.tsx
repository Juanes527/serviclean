'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ArrowLeft, Mail, MailCheck } from 'lucide-react';
import Alerta from '@/components/Alerta';
import Boton, { clasesBoton } from '@/components/Boton';
import CampoTexto from '@/components/CampoTexto';
import DisenoAutenticacion from '@/components/DisenoAutenticacion';
import { authServicio } from '@/servicios/auth.servicio';
import { mensajeError } from '@/utilidades/errores';

export default function PaginaRecuperarContrasena() {
  const [correo, setCorreo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    setError('');
    setMensaje('');
    setCargando(true);
    try {
      const resultado = await authServicio.recuperarContrasena(correo);
      setMensaje(resultado.mensaje);
    } catch (excepcion) {
      setError(mensajeError(excepcion, 'No fue posible procesar la solicitud.'));
    } finally {
      setCargando(false);
    }
  };

  const volver = (
    <Link href="/iniciar-sesion" className="inline-flex items-center gap-1.5 font-semibold text-marca-700 hover:text-marca-800 hover:underline">
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Volver a iniciar sesión
    </Link>
  );

  if (mensaje) {
    return (
      <DisenoAutenticacion titulo="Revisa tu correo" pie={volver}>
        <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50/60 px-6 py-8 text-center" role="status">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100">
            <MailCheck className="h-7 w-7" aria-hidden />
          </span>
          <p className="mt-5 text-[15px] leading-relaxed text-slate-700">{mensaje}</p>
          <p className="mt-2 text-sm text-slate-500">
            Enviamos las instrucciones a <span className="font-semibold text-slate-700">{correo}</span>.
          </p>
          <button
            type="button"
            onClick={() => setMensaje('')}
            className={clasesBoton('secundario', 'sm', 'mt-5')}
          >
            Usar otro correo
          </button>
        </div>
      </DisenoAutenticacion>
    );
  }

  return (
    <DisenoAutenticacion
      titulo="Recupera tu contraseña"
      descripcion="Ingresa el correo con el que te registraste y te enviaremos un enlace para restablecerla."
      pie={volver}
    >
      {error && <Alerta tipo="error" mensaje={error} className="mb-5" />}
      <form onSubmit={enviar} className="flex flex-col gap-5">
        <CampoTexto
          etiqueta="Correo electrónico"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="tu@correo.com"
          icono={<Mail />}
          value={correo}
          onChange={(evento) => setCorreo(evento.target.value)}
          required
        />
        <Boton type="submit" tamano="lg" cargando={cargando} className="w-full">
          {cargando ? 'Enviando…' : 'Enviar instrucciones'}
        </Boton>
      </form>
    </DisenoAutenticacion>
  );
}
