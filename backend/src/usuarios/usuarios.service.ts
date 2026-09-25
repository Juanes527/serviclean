import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RolUsuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto';
import { ActualizarEstadoDto } from './dto/actualizar-estado.dto';

const sinContrasena = (usuario: any) => {
  const { contrasena, ...resto } = usuario;
  return resto;
};

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async listar(rol?: RolUsuario) {
    const usuarios = await this.prisma.usuario.findMany({
      where: rol ? { rol } : undefined,
      orderBy: { fechaCreacion: 'desc' },
    });
    return usuarios.map(sinContrasena);
  }

  async obtenerPorId(id: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado.');
    }
    return sinContrasena(usuario);
  }

  async actualizarPerfil(usuarioId: string, datos: ActualizarPerfilDto) {
    const correoEnUso = await this.prisma.usuario.findFirst({
      where: { correo: datos.correo, NOT: { id: usuarioId } },
    });
    if (correoEnUso) {
      throw new ConflictException('Ya existe un usuario con este correo.');
    }

    const usuario = await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: datos,
    });
    return sinContrasena(usuario);
  }

  async cambiarContrasena(usuarioId: string, datos: CambiarContrasenaDto) {
    if (datos.nuevaContrasena !== datos.confirmarContrasena) {
      throw new BadRequestException('Las contraseñas no coinciden.');
    }

    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const contrasenaValida = await bcrypt.compare(datos.contrasenaActual, usuario.contrasena);
    if (!contrasenaValida) {
      throw new BadRequestException('La contraseña actual es incorrecta.');
    }

    const contrasenaHash = await bcrypt.hash(datos.nuevaContrasena, 10);
    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { contrasena: contrasenaHash },
    });

    return { mensaje: 'La contraseña fue actualizada correctamente.' };
  }

  async actualizarEstado(id: string, datos: ActualizarEstadoDto) {
    const usuario = await this.prisma.usuario.update({
      where: { id },
      data: { estado: datos.estado },
    });
    return sinContrasena(usuario);
  }

  async personalActivo() {
    const personal = await this.prisma.usuario.findMany({
      where: { rol: RolUsuario.PERSONAL_ASEO, estado: 'ACTIVO' },
    });
    return personal.map(sinContrasena);
  }
}
