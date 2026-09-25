import { api } from '@/utilidades/apiCliente';
import { RolUsuario, Usuario } from '@/tipos';

export interface RespuestaAutenticacion {
  token: string;
  usuario: { id: string; nombre: string; apellido: string; correo: string; rol: RolUsuario };
}

export interface DatosRegistro {
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  contrasena: string;
  confirmarContrasena: string;
  rol: 'CLIENTE' | 'PERSONAL_ASEO';
}

export const authServicio = {
  registrar: (datos: DatosRegistro) => api.post<RespuestaAutenticacion>('/auth/registro', datos),
  iniciarSesion: (correo: string, contrasena: string) =>
    api.post<RespuestaAutenticacion>('/auth/login', { correo, contrasena }),
  cerrarSesion: () => api.post('/auth/logout'),
  recuperarContrasena: (correo: string) => api.post<{ mensaje: string }>('/auth/recuperar-contrasena', { correo }),
  restablecerContrasena: (token: string, nuevaContrasena: string) =>
    api.post<{ mensaje: string }>('/auth/restablecer-contrasena', { token, nuevaContrasena }),
  obtenerPerfil: () => api.get<Usuario>('/auth/perfil'),
};
