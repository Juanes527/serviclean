'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import { RolUsuario } from '@/tipos';
import { rutaInicioPorRol, useAutenticacion } from '@/utilidades/contextoAutenticacion';
import Cargando from './Cargando';

export default function ProtegerRuta({ rol, children }: { rol: RolUsuario; children: ReactNode }) {
  const { usuario, cargando } = useAutenticacion();
  const router = useRouter();

  useEffect(() => {
    if (cargando) return;
    if (!usuario) {
      router.replace('/iniciar-sesion');
      return;
    }
    if (usuario.rol !== rol) {
      router.replace(rutaInicioPorRol(usuario.rol));
    }
  }, [cargando, usuario, rol, router]);

  if (cargando || !usuario || usuario.rol !== rol) {
    return <Cargando texto="Preparando tu panel…" pantallaCompleta />;
  }

  return <>{children}</>;
}
