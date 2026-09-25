'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authServicio } from '@/servicios/auth.servicio';
import { Usuario } from '@/tipos';

interface ContextoAutenticacion {
  usuario: Usuario | null;
  cargando: boolean;
  refrescarPerfil: () => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

const RUTAS_INICIO: Record<string, string> = {
  CLIENTE: '/cliente',
  PERSONAL_ASEO: '/personal',
  ADMINISTRADOR: '/admin',
};

const Contexto = createContext<ContextoAutenticacion | undefined>(undefined);

export function ProveedorAutenticacion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);
  const router = useRouter();

  const refrescarPerfil = async () => {
    try {
      const perfil = await authServicio.obtenerPerfil();
      setUsuario(perfil);
    } catch {
      setUsuario(null);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    refrescarPerfil();
  }, []);

  const cerrarSesion = async () => {
    await authServicio.cerrarSesion();
    setUsuario(null);
    router.push('/iniciar-sesion');
  };

  return (
    <Contexto.Provider value={{ usuario, cargando, refrescarPerfil, cerrarSesion }}>
      {children}
    </Contexto.Provider>
  );
}

export function useAutenticacion() {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error('useAutenticacion debe usarse dentro de ProveedorAutenticacion.');
  }
  return contexto;
}

export function rutaInicioPorRol(rol: string): string {
  return RUTAS_INICIO[rol] ?? '/iniciar-sesion';
}
