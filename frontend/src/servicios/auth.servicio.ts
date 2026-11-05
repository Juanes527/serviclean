import { api } from '@/utilidades/apiCliente';
import { RolUsuario, Usuario } from '@/tipos';

/** La sesión viaja en cookies HttpOnly; la respuesta solo trae los datos del usuario. */
export interface RespuestaAutenticacion {
  usuario: { id: string; nombre: string; apellido: string; correo: string; rol: RolUsuario };
}

export type RespuestaRegistro = RespuestaAutenticacion | { requiereVerificacion: true; correo: string };

export interface DatosRegistro {
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  contrasena: string;
  confirmarContrasena: string;
  rol: 'CLIENTE' | 'PERSONAL_ASEO';
}

/** Código que envía el backend cuando la cuenta existe pero el correo no se ha verificado. */
export const CODIGO_CORREO_NO_VERIFICADO = 'CORREO_NO_VERIFICADO';

export const authServicio = {
  registrar: (datos: DatosRegistro) => api.post<RespuestaRegistro>('/auth/registro', datos),
  iniciarSesion: (correo: string, contrasena: string) =>
    api.post<RespuestaAutenticacion>('/auth/login', { correo, contrasena }),
  cerrarSesion: () => api.post('/auth/logout'),
  verificarCorreo: (tokenHash: string) => api.post<RespuestaAutenticacion>('/auth/verificar-correo', { tokenHash }),
  reenviarVerificacion: (correo: string) => api.post<{ mensaje: string }>('/auth/reenviar-verificacion', { correo }),
  recuperarContrasena: (correo: string) => api.post<{ mensaje: string }>('/auth/recuperar-contrasena', { correo }),
  restablecerContrasena: (tokenHash: string, nuevaContrasena: string) =>
    api.post<{ mensaje: string }>('/auth/restablecer-contrasena', { tokenHash, nuevaContrasena }),
  obtenerPerfil: () => api.get<Usuario>('/auth/perfil'),
};
