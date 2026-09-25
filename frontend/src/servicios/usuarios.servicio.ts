import { api } from '@/utilidades/apiCliente';
import { EstadoUsuario, RolUsuario, Usuario } from '@/tipos';

export interface DatosPerfil {
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
}

export interface DatosCambioContrasena {
  contrasenaActual: string;
  nuevaContrasena: string;
  confirmarContrasena: string;
}

export const usuariosServicio = {
  listar: (rol?: RolUsuario) => api.get<Usuario[]>(`/usuarios${rol ? `?rol=${rol}` : ''}`),
  obtenerPorId: (id: string) => api.get<Usuario>(`/usuarios/${id}`),
  actualizarPerfil: (datos: DatosPerfil) => api.patch<Usuario>('/usuarios/perfil', datos),
  cambiarContrasena: (datos: DatosCambioContrasena) =>
    api.patch<{ mensaje: string }>('/usuarios/cambiar-contrasena', datos),
  actualizarEstado: (id: string, estado: EstadoUsuario) =>
    api.patch<Usuario>(`/usuarios/${id}/estado`, { estado }),
};
