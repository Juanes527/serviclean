import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface UsuarioAutenticado {
  id: string;
  correo: string;
  rol: 'CLIENTE' | 'PERSONAL_ASEO' | 'ADMINISTRADOR';
}

export const UsuarioActual = createParamDecorator(
  (_datos: unknown, contexto: ExecutionContext): UsuarioAutenticado => {
    const peticion = contexto.switchToHttp().getRequest();
    return peticion.user;
  },
);
