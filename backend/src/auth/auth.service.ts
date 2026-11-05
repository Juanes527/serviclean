import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Session } from '@supabase/supabase-js';
import { Usuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { errorDeSupabase } from './errores-supabase';
import { RegistroDto } from './dto/registro.dto';
import { IniciarSesionDto } from './dto/iniciar-sesion.dto';
import { RecuperarContrasenaDto } from './dto/recuperar-contrasena.dto';
import { RestablecerContrasenaDto } from './dto/restablecer-contrasena.dto';
import { VerificarCorreoDto } from './dto/verificar-correo.dto';

export const CODIGO_CORREO_NO_VERIFICADO = 'CORREO_NO_VERIFICADO';

const MENSAJE_RECUPERACION = 'Si el correo está registrado, se enviaron instrucciones para recuperar la contraseña.';
const MENSAJE_REENVIO = 'Si la cuenta existe y no está verificada, enviamos un nuevo enlace de verificación.';

export interface ResultadoSesion {
  sesion: Session;
  usuario: ReturnType<typeof usuarioPublico>;
}

/** Datos del usuario que se envían al frontend (sin hash heredado ni id de Supabase). */
export function usuarioPublico(usuario: Usuario) {
  const { contrasena, authId, ...resto } = usuario;
  return resto;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly urlFrontend: string;

  constructor(
    private prisma: PrismaService,
    private supabase: SupabaseService,
    configService: ConfigService,
  ) {
    // FRONTEND_URL puede traer varios orígenes separados por coma (CORS); los enlaces usan el primero.
    this.urlFrontend = (configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000').split(',')[0].trim();
  }

  /**
   * Crea la cuenta en Supabase Auth y el usuario de ServiClean enlazado. Si Supabase exige confirmar el
   * correo (lo normal), no hay sesión hasta que el usuario abra el enlace de verificación.
   */
  async registrar(datos: RegistroDto): Promise<ResultadoSesion | { requiereVerificacion: true; correo: string }> {
    if (datos.contrasena !== datos.confirmarContrasena) {
      throw new BadRequestException('Las contraseñas no coinciden.');
    }
    const correo = datos.correo.trim().toLowerCase();
    if (await this.prisma.usuario.findUnique({ where: { correo } })) {
      throw new ConflictException('Ya existe un usuario con este correo.');
    }

    const { data, error } = await this.supabase.publico().auth.signUp({
      email: correo,
      password: datos.contrasena,
      options: { emailRedirectTo: `${this.urlFrontend}/verificar-correo` },
    });
    if (error) throw errorDeSupabase(error, 'No fue posible completar el registro.');
    // Con la confirmación de correo activa, Supabase no informa error si el correo ya existe:
    // devuelve un usuario sin identidades.
    if (!data.user || data.user.identities?.length === 0) {
      throw new ConflictException('Ya existe un usuario con este correo.');
    }

    let usuario: Usuario;
    try {
      usuario = await this.prisma.usuario.create({
        data: {
          authId: data.user.id,
          nombre: datos.nombre,
          apellido: datos.apellido,
          correo,
          telefono: datos.telefono,
          rol: datos.rol,
        },
      });
    } catch (excepcion) {
      // Sin usuario de ServiClean la cuenta de Supabase quedaría huérfana y bloquearía el correo.
      await this.supabase.admin.auth.admin.deleteUser(data.user.id);
      throw excepcion;
    }

    if (!data.session) {
      return { requiereVerificacion: true, correo };
    }
    return { sesion: data.session, usuario: usuarioPublico(usuario) };
  }

  async iniciarSesion(datos: IniciarSesionDto): Promise<ResultadoSesion> {
    const { data, error } = await this.supabase.publico().auth.signInWithPassword({
      email: datos.correo.trim().toLowerCase(),
      password: datos.contrasena,
    });
    if (error?.code === 'email_not_confirmed') {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Debes verificar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.',
        codigo: CODIGO_CORREO_NO_VERIFICADO,
      });
    }
    if (error?.code === 'invalid_credentials') {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }
    if (error) throw errorDeSupabase(error, 'No fue posible iniciar sesión.');

    return this.sesionDeUsuario(data.session);
  }

  /** Confirma el correo con el token del enlace de verificación e inicia la sesión. */
  async verificarCorreo(datos: VerificarCorreoDto): Promise<ResultadoSesion> {
    const { data, error } = await this.supabase.publico().auth.verifyOtp({
      token_hash: datos.tokenHash,
      type: 'email',
    });
    if (error || !data.session) {
      throw new BadRequestException('El enlace de verificación no es válido o expiró. Solicita uno nuevo.');
    }
    return this.sesionDeUsuario(data.session);
  }

  async reenviarVerificacion(datos: RecuperarContrasenaDto) {
    const { error } = await this.supabase.publico().auth.resend({
      type: 'signup',
      email: datos.correo.trim().toLowerCase(),
      options: { emailRedirectTo: `${this.urlFrontend}/verificar-correo` },
    });
    if (error?.code === 'over_email_send_rate_limit' || error?.code === 'over_request_rate_limit') {
      throw errorDeSupabase(error, MENSAJE_REENVIO);
    }
    if (error) this.logger.warn(`Reenvío de verificación fallido: ${error.message}`);
    // Mismo mensaje exista o no la cuenta, para no revelar qué correos están registrados.
    return { mensaje: MENSAJE_REENVIO };
  }

  async solicitarRecuperacion(datos: RecuperarContrasenaDto) {
    const { error } = await this.supabase.publico().auth.resetPasswordForEmail(datos.correo.trim().toLowerCase(), {
      redirectTo: `${this.urlFrontend}/restablecer-contrasena`,
    });
    if (error?.code === 'over_email_send_rate_limit' || error?.code === 'over_request_rate_limit') {
      throw errorDeSupabase(error, MENSAJE_RECUPERACION);
    }
    if (error) this.logger.warn(`Solicitud de recuperación fallida: ${error.message}`);
    return { mensaje: MENSAJE_RECUPERACION };
  }

  async restablecerContrasena(datos: RestablecerContrasenaDto) {
    const { data, error } = await this.supabase.publico().auth.verifyOtp({
      token_hash: datos.tokenHash,
      type: 'recovery',
    });
    if (error || !data.user || !data.session) {
      throw new BadRequestException('El enlace de recuperación no es válido o expiró. Solicita uno nuevo.');
    }

    const { error: errorActualizacion } = await this.supabase.admin.auth.admin.updateUserById(data.user.id, {
      password: datos.nuevaContrasena,
    });
    if (errorActualizacion) throw errorDeSupabase(errorActualizacion, 'No fue posible restablecer la contraseña.');

    // Cierra todas las sesiones abiertas: quien tenía la contraseña anterior pierde el acceso.
    await this.supabase.admin.auth.admin.signOut(data.session.access_token, 'global');
    return { mensaje: 'La contraseña fue actualizada correctamente.' };
  }

  async refrescarSesion(refreshToken: string | undefined): Promise<Session> {
    if (!refreshToken) {
      throw new UnauthorizedException('Debe iniciar sesión.');
    }
    const { data, error } = await this.supabase.publico().auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) {
      throw new UnauthorizedException('La sesión expiró. Inicie sesión de nuevo.');
    }
    return data.session;
  }

  /** Revoca el refresh token de la sesión actual en Supabase. Si el token ya no es válido no hay nada que revocar. */
  async cerrarSesion(tokenAcceso: string | undefined) {
    if (!tokenAcceso) return;
    const { error } = await this.supabase.admin.auth.admin.signOut(tokenAcceso, 'local');
    if (error) this.logger.debug(`Cierre de sesión en Supabase omitido: ${error.message}`);
  }

  async obtenerPerfil(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }
    return usuarioPublico(usuario);
  }

  private async sesionDeUsuario(sesion: Session): Promise<ResultadoSesion> {
    const usuario = await this.prisma.usuario.findUnique({ where: { authId: sesion.user.id } });
    if (!usuario || usuario.estado === 'INACTIVO') {
      await this.cerrarSesion(sesion.access_token);
      throw new UnauthorizedException(
        usuario
          ? 'Este usuario se encuentra inactivo. Contacte al administrador.'
          : 'No encontramos una cuenta de ServiClean asociada a este correo.',
      );
    }
    return { sesion, usuario: usuarioPublico(usuario) };
  }
}
