'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { ArrowLeft, LinkIcon, LockKeyhole } from 'lucide-react';
import Alerta from '@/components/Alerta';
import { useAvisos } from '@/components/Avisos';
import Boton, { clasesBoton } from '@/components/Boton';
import Cargando from '@/components/Cargando';
import CampoTexto from '@/components/CampoTexto';
import DisenoAutenticacion from '@/components/DisenoAutenticacion';
import { authServicio } from '@/servicios/auth.servicio';
import { mensajeError } from '@/utilidades/errores';

function FormularioRestablecer() {
  const router = useRouter();
  const { avisar } = useAvisos();
  const parametros = useSearchParams();
  // Enlace del correo de Supabase: /restablecer-contrasena?token_hash=...&type=recovery
  const token = parametros.get('token_hash') ?? '';
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [errores, setErrores] = useState<{ nueva?: string; confirmar?: string }>({});
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const volver = (
    <Link href="/iniciar-sesion" className="inline-flex items-center gap-1.5 font-semibold text-marca-700 hover:text-marca-800 hover:underline">
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Volver a iniciar sesión
    </Link>
  );

  if (!token) {
    return (
      <DisenoAutenticacion titulo="Enlace no válido" pie={volver}>
        <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50/60 px-6 py-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-100">
            <LinkIcon className="h-7 w-7" aria-hidden />
          </span>
          <p className="mt-5 text-[15px] leading-relaxed text-slate-600">
            El enlace de recuperación no es válido o está incompleto. Solicita uno nuevo para continuar.
          </p>
          <Link href="/recuperar-contrasena" className={clasesBoton('primario', 'md', 'mt-6')}>
            Solicitar nuevo enlace
          </Link>
        </div>
      </DisenoAutenticacion>
    );
  }

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    setError('');
    const nuevosErrores: typeof errores = {};
    if (nuevaContrasena.length < 8) nuevosErrores.nueva = 'La contraseña debe tener al menos 8 caracteres.';
    if (nuevaContrasena !== confirmarContrasena) nuevosErrores.confirmar = 'Las contraseñas no coinciden.';
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    setCargando(true);
    try {
      await authServicio.restablecerContrasena(token, nuevaContrasena);
      avisar({ tipo: 'exito', titulo: 'Contraseña actualizada', descripcion: 'Ya puedes iniciar sesión con tu nueva contraseña.' });
      router.push('/iniciar-sesion');
    } catch (excepcion) {
      setError(mensajeError(excepcion, 'No fue posible restablecer la contraseña.'));
      setCargando(false);
    }
  };

  return (
    <DisenoAutenticacion
      titulo="Crea una nueva contraseña"
      descripcion="Elige una contraseña segura que no hayas usado antes."
      pie={volver}
    >
      {error && <Alerta tipo="error" mensaje={error} className="mb-5" />}
      <form onSubmit={enviar} className="flex flex-col gap-5" noValidate>
        <CampoTexto
          etiqueta="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          icono={<LockKeyhole />}
          value={nuevaContrasena}
          onChange={(evento) => setNuevaContrasena(evento.target.value)}
          error={errores.nueva}
          ayuda="Mínimo 8 caracteres."
          required
        />
        <CampoTexto
          etiqueta="Confirmar contraseña"
          type="password"
          autoComplete="new-password"
          icono={<LockKeyhole />}
          value={confirmarContrasena}
          onChange={(evento) => setConfirmarContrasena(evento.target.value)}
          error={errores.confirmar}
          required
        />
        <Boton type="submit" tamano="lg" cargando={cargando} className="w-full">
          {cargando ? 'Guardando…' : 'Guardar contraseña'}
        </Boton>
      </form>
    </DisenoAutenticacion>
  );
}

export default function PaginaRestablecerContrasena() {
  return (
    <Suspense fallback={<Cargando pantallaCompleta />}>
      <FormularioRestablecer />
    </Suspense>
  );
}
