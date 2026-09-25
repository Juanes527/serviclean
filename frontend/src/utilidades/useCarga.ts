'use client';

import { DependencyList, Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { mensajeError } from './errores';

interface ResultadoCarga<T> {
  datos: T | null;
  setDatos: Dispatch<SetStateAction<T | null>>;
  cargando: boolean;
  error: string;
  /** Vuelve a consultar. Con `silencioso` no muestra el estado de carga (útil tras una acción). */
  recargar: (silencioso?: boolean) => Promise<void>;
}

/**
 * Consulta datos de la API y expone los estados de carga y error.
 * Evita repetir el patrón useState + useEffect + finally en cada página.
 */
export function useCarga<T>(consulta: () => Promise<T>, dependencias: DependencyList = []): ResultadoCarga<T> {
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const consultaActual = useRef(consulta);
  consultaActual.current = consulta;
  const idPeticion = useRef(0);

  const recargar = useCallback(async (silencioso = false) => {
    const id = ++idPeticion.current;
    if (!silencioso) setCargando(true);
    setError('');
    try {
      const resultado = await consultaActual.current();
      if (id === idPeticion.current) setDatos(resultado);
    } catch (excepcion) {
      if (id === idPeticion.current) setError(mensajeError(excepcion, 'No fue posible cargar la información.'));
    } finally {
      if (id === idPeticion.current) setCargando(false);
    }
  }, []);

  useEffect(() => {
    recargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias);

  return { datos, setDatos, cargando, error, recargar };
}
