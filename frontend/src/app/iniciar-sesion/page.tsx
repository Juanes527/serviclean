'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';
import Alerta from '@/components/Alerta';
import Boton from '@/components/Boton';
import CampoTexto from '@/components/CampoTexto';
import DisenoAutenticacion from '@/components/DisenoAutenticacion';
import { authServicio } from '@/servicios/auth.servicio';
import { rutaInicioPorRol, useAutenticacion } from '@/utilidades/contextoAutenticacion';
import { mensajeError } from '@/utilidades/errores';

export default function PaginaIniciarSesion() {
  const router = useRouter();
  const { refrescarPerfil } = useAutenticacion();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    setError('');
    setCargando(true);
    try {
      const resultado = await authServicio.iniciarSesion(correo, contrasena);
      await refrescarPerfil();
      router.push(rutaInicioPorRol(resultado.usuario.rol));
    } catch (excepcion) {
      setError(mensajeError(excepcion, 'No fue posible iniciar sesión.'));
      setCargando(false);
    }
  };

  return (
    <DisenoAutenticacion
      titulo="Hola de nuevo"
      descripcion="Ingresa a tu cuenta para gestionar tus servicios de limpieza."
      pie={
        <>
          ¿Aún no tienes una cuenta?{' '}
          <Link href="/registro" className="font-semibold text-marca-700 hover:text-marca-800 hover:underline">
            Crear cuenta
          </Link>
        </>
      }
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
        <CampoTexto
          etiqueta="Contraseña"
          type="password"
          autoComplete="current-password"
          placeholder="Tu contraseña"
          icono={<LockKeyhole />}
          value={contrasena}
          onChange={(evento) => setContrasena(evento.target.value)}
          required
          accionEtiqueta={
            <Link href="/recuperar-contrasena" className="text-sm font-medium text-marca-700 hover:text-marca-800 hover:underline">
              ¿La olvidaste?
            </Link>
          }
        />
        <Boton type="submit" tamano="lg" cargando={cargando} className="mt-1 w-full" iconoDerecha={<ArrowRight className="h-4 w-4" />}>
          {cargando ? 'Ingresando…' : 'Iniciar sesión'}
        </Boton>
      </form>
    </DisenoAutenticacion>
  );
}
