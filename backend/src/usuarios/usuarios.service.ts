import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { usuarioPublico } from '../auth/auth.service';
import { errorDeSupabase } from '../auth/errores-supabase';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto';
import { ActualizarEstadoDto } from './dto/actualizar-estado.dto';

@Injectable()
export class UsuariosService {
  constructor(
    private prisma: PrismaService,
    private supabase: SupabaseService,
  ) {}

  async listar(rol?: RolUsuario) {
    const usuarios = await this.prisma.usuario.findMany({
      where: rol ? { rol } : undefined,
      orderBy: { fechaCreacion: 'desc' },
    });
    return usuarios.map(usuarioPublico);
  }

  async obtenerPorId(id: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado.');
    }
    return usuarioPublico(usuario);
  }

  async actualizarPerfil(usuarioId: string, datos: ActualizarPerfilDto) {
    const correo = datos.correo.trim().toLowerCase();
    const correoEnUso = await this.prisma.usuario.findFirst({
      where: { correo, NOT: { id: usuarioId } },
    });
    if (correoEnUso) {
      throw new ConflictException('Ya existe un usuario con este correo.');
    }

    const actual = await this.obtenerConCuenta(usuarioId);
    const cambiaCorreo = actual.correo !== correo;
    // El correo es el usuario de inicio de sesión en Supabase Auth: se actualiza primero allá.
    if (cambiaCorreo) await this.actualizarCorreoEnSupabase(actual.authId, correo);

    try {
      const usuario = await this.prisma.usuario.update({
        where: { id: usuarioId },
        data: { ...datos, correo },
      });
      return usuarioPublico(usuario);
    } catch (excepcion) {
      if (cambiaCorreo) await this.actualizarCorreoEnSupabase(actual.authId, actual.correo);
      throw excepcion;
    }
  }

  async cambiarContrasena(usuarioId: string, datos: CambiarContrasenaDto) {
    if (datos.nuevaContrasena !== datos.confirmarContrasena) {
      throw new BadRequestException('Las contraseñas no coinciden.');
    }

    const usuario = await this.obtenerConCuenta(usuarioId);

    // Supabase no expone la contraseña: se comprueba la actual iniciando una sesión temporal.
    const { data, error } = await this.supabase.publico().auth.signInWithPassword({
      email: usuario.correo,
      password: datos.contrasenaActual,
    });
    if (error || !data.session) {
      throw new BadRequestException('La contraseña actual es incorrecta.');
    }
    await this.supabase.admin.auth.admin.signOut(data.session.access_token, 'local');

    const { error: errorActualizacion } = await this.supabase.admin.auth.admin.updateUserById(usuario.authId, {
      password: datos.nuevaContrasena,
    });
    if (errorActualizacion) throw errorDeSupabase(errorActualizacion, 'No fue posible actualizar la contraseña.');

    return { mensaje: 'La contraseña fue actualizada correctamente.' };
  }

  async actualizarEstado(id: string, datos: ActualizarEstadoDto) {
    const usuario = await this.prisma.usuario.update({
      where: { id },
      data: { estado: datos.estado },
    });
    return usuarioPublico(usuario);
  }

  async personalActivo() {
    const personal = await this.prisma.usuario.findMany({
      where: { rol: RolUsuario.PERSONAL_ASEO, estado: 'ACTIVO' },
    });
    return personal.map(usuarioPublico);
  }

  private async obtenerConCuenta(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado.');
    }
    if (!usuario.authId) {
      throw new BadRequestException('La cuenta no está enlazada con Supabase Auth.');
    }
    return { ...usuario, authId: usuario.authId };
  }

  private async actualizarCorreoEnSupabase(authId: string, correo: string) {
    const { error } = await this.supabase.admin.auth.admin.updateUserById(authId, { email: correo, email_confirm: true });
    if (error) throw errorDeSupabase(error, 'No fue posible actualizar el correo.');
  }
}
