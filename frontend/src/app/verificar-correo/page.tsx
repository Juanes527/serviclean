'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { ArrowLeft, LinkIcon } from 'lucide-react';
import { clasesBoton } from '@/components/Boton';
import Cargando from '@/components/Cargando';
import DisenoAutenticacion from '@/components/DisenoAutenticacion';
import { authServicio } from '@/servicios/auth.servicio';
import { rutaInicioPorRol, useAutenticacion } from '@/utilidades/contextoAutenticacion';
import { mensajeError } from '@/utilidades/errores';

/** Destino del enlace del correo de confirmación: /verificar-correo?token_hash=...&type=email */
function VerificarCorreo() {
  const router = useRouter();
  const parametros = useSearchParams();
  const { refrescarPerfil } = useAutenticacion();
  const tokenHash = parametros.get('token_hash') ?? '';
  const [error, setError] = useState(tokenHash ? '' : 'El enlace de verificación no es válido o está incompleto.');
  // El token es de un solo uso: evita verificarlo dos veces (React monta dos veces en desarrollo).
  const verificado = useRef(false);

  useEffect(() => {
    if (!tokenHash || verificado.current) return;
    verificado.current = true;
    authServicio
      .verificarCorreo(tokenHash)
      .then(async (resultado) => {
        await refrescarPerfil();
        router.replace(rutaInicioPorRol(resultado.usuario.rol));
      })
      .catch((excepcion) => setError(mensajeError(excepcion, 'No fue posible verificar tu correo.')));
  }, [tokenHash, refrescarPerfil, router]);

  if (!error) {
    return <Cargando texto="Verificando tu correo…" pantallaCompleta />;
  }

  return (
    <DisenoAutenticacion
      titulo="No pudimos verificar tu correo"
      pie={
        <Link href="/iniciar-sesion" className="inline-flex items-center gap-1.5 font-semibold text-marca-700 hover:text-marca-800 hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Volver a iniciar sesión
        </Link>
      }
    >
      <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50/60 px-6 py-8 text-center" role="alert">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-100">
          <LinkIcon className="h-7 w-7" aria-hidden />
        </span>
        <p className="mt-5 text-[15px] leading-relaxed text-slate-600">{error}</p>
        <p className="mt-2 text-sm text-slate-500">Inicia sesión con tu correo para recibir un enlace nuevo.</p>
        <Link href="/iniciar-sesion" className={clasesBoton('primario', 'md', 'mt-6')}>
          Iniciar sesión
        </Link>
      </div>
    </DisenoAutenticacion>
  );
}

export default function PaginaVerificarCorreo() {
  return (
    <Suspense fallback={<Cargando pantallaCompleta />}>
      <VerificarCorreo />
    </Suspense>
  );
}
