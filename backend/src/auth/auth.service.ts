import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegistroDto } from './dto/registro.dto';
import { IniciarSesionDto } from './dto/iniciar-sesion.dto';
import { RecuperarContrasenaDto } from './dto/recuperar-contrasena.dto';
import { RestablecerContrasenaDto } from './dto/restablecer-contrasena.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async registrar(datos: RegistroDto) {
    if (datos.contrasena !== datos.confirmarContrasena) {
      throw new BadRequestException('Las contraseñas no coinciden.');
    }

    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { correo: datos.correo },
    });
    if (usuarioExistente) {
      throw new ConflictException('Ya existe un usuario con este correo.');
    }

    const contrasenaHash = await bcrypt.hash(datos.contrasena, 10);

    const usuario = await this.prisma.usuario.create({
      data: {
        nombre: datos.nombre,
        apellido: datos.apellido,
        correo: datos.correo,
        telefono: datos.telefono,
        contrasena: contrasenaHash,
        rol: datos.rol,
      },
    });

    return this.generarRespuestaAutenticacion(usuario);
  }

  async iniciarSesion(datos: IniciarSesionDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { correo: datos.correo },
    });
    if (!usuario) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    if (usuario.estado === 'INACTIVO') {
      throw new UnauthorizedException('Este usuario se encuentra inactivo. Contacte al administrador.');
    }

    const contrasenaValida = await bcrypt.compare(datos.contrasena, usuario.contrasena);
    if (!contrasenaValida) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    return this.generarRespuestaAutenticacion(usuario);
  }

  async solicitarRecuperacion(datos: RecuperarContrasenaDto) {
    const usuario = await this.prisma.usuario.findUnique({ where: { correo: datos.correo } });

    if (usuario) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiracion = new Date(Date.now() + 1000 * 60 * 30);

      await this.prisma.tokenRecuperacion.create({
        data: { token, usuarioId: usuario.id, expiracion },
      });

      console.log(`Enlace de recuperación para ${usuario.correo}: /restablecer-contrasena?token=${token}`);
    }

    return {
      mensaje: 'Si el correo está registrado, se enviaron instrucciones para recuperar la contraseña.',
    };
  }

  async restablecerContrasena(datos: RestablecerContrasenaDto) {
    const tokenRecuperacion = await this.prisma.tokenRecuperacion.findUnique({
      where: { token: datos.token },
    });

    if (!tokenRecuperacion || tokenRecuperacion.utilizado) {
      throw new BadRequestException('El enlace de recuperación no es válido o ya fue utilizado.');
    }

    if (tokenRecuperacion.expiracion < new Date()) {
      throw new BadRequestException('El enlace de recuperación ha expirado.');
    }

    const contrasenaHash = await bcrypt.hash(datos.nuevaContrasena, 10);

    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: tokenRecuperacion.usuarioId },
        data: { contrasena: contrasenaHash },
      }),
      this.prisma.tokenRecuperacion.update({
        where: { id: tokenRecuperacion.id },
        data: { utilizado: true },
      }),
    ]);

    return { mensaje: 'La contraseña fue actualizada correctamente.' };
  }

  async obtenerPerfil(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }
    const { contrasena, ...usuarioSinContrasena } = usuario;
    return usuarioSinContrasena;
  }

  private generarRespuestaAutenticacion(usuario: {
    id: string;
    correo: string;
    rol: string;
    nombre: string;
    apellido: string;
  }) {
    const payload = { sub: usuario.id, correo: usuario.correo, rol: usuario.rol };
    const token = this.jwtService.sign(payload);
    return {
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        correo: usuario.correo,
        rol: usuario.rol,
      },
    };
  }
}
