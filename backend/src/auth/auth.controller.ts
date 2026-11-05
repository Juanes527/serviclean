import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Publico } from '../comun/decoradores/publico.decorador';
import { UsuarioActual, UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';
import { AuthService } from './auth.service';
import { borrarSesion, COOKIE_ACCESO, COOKIE_REFRESCO, guardarSesion } from './cookies';
import { RegistroDto } from './dto/registro.dto';
import { IniciarSesionDto } from './dto/iniciar-sesion.dto';
import { RecuperarContrasenaDto } from './dto/recuperar-contrasena.dto';
import { RestablecerContrasenaDto } from './dto/restablecer-contrasena.dto';
import { VerificarCorreoDto } from './dto/verificar-correo.dto';

/** Los tokens de Supabase solo viajan en cookies HttpOnly; el cuerpo de la respuesta nunca los incluye. */
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Publico()
  @Post('registro')
  async registro(@Body() datos: RegistroDto, @Res({ passthrough: true }) respuesta: Response) {
    const resultado = await this.authService.registrar(datos);
    if ('requiereVerificacion' in resultado) {
      return resultado;
    }
    guardarSesion(respuesta, resultado.sesion);
    return { usuario: resultado.usuario };
  }

  @Publico()
  @Post('login')
  @HttpCode(200)
  async login(@Body() datos: IniciarSesionDto, @Res({ passthrough: true }) respuesta: Response) {
    const { sesion, usuario } = await this.authService.iniciarSesion(datos);
    guardarSesion(respuesta, sesion);
    return { usuario };
  }

  @Publico()
  @Post('verificar-correo')
  @HttpCode(200)
  async verificarCorreo(@Body() datos: VerificarCorreoDto, @Res({ passthrough: true }) respuesta: Response) {
    const { sesion, usuario } = await this.authService.verificarCorreo(datos);
    guardarSesion(respuesta, sesion);
    return { usuario };
  }

  @Publico()
  @Post('reenviar-verificacion')
  @HttpCode(200)
  async reenviarVerificacion(@Body() datos: RecuperarContrasenaDto) {
    return this.authService.reenviarVerificacion(datos);
  }

  @Publico()
  @Post('refrescar')
  @HttpCode(200)
  async refrescar(@Req() peticion: Request, @Res({ passthrough: true }) respuesta: Response) {
    try {
      const sesion = await this.authService.refrescarSesion(peticion.cookies?.[COOKIE_REFRESCO]);
      guardarSesion(respuesta, sesion);
      return { mensaje: 'Sesión renovada.' };
    } catch (excepcion) {
      borrarSesion(respuesta);
      throw excepcion;
    }
  }

  // Público para poder cerrar sesión aunque el token de acceso ya haya expirado.
  @Publico()
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() peticion: Request, @Res({ passthrough: true }) respuesta: Response) {
    await this.authService.cerrarSesion(peticion.cookies?.[COOKIE_ACCESO]);
    borrarSesion(respuesta);
    return { mensaje: 'Sesión cerrada correctamente.' };
  }

  @Publico()
  @Post('recuperar-contrasena')
  @HttpCode(200)
  async recuperarContrasena(@Body() datos: RecuperarContrasenaDto) {
    return this.authService.solicitarRecuperacion(datos);
  }

  @Publico()
  @Post('restablecer-contrasena')
  @HttpCode(200)
  async restablecerContrasena(@Body() datos: RestablecerContrasenaDto) {
    return this.authService.restablecerContrasena(datos);
  }

  @Get('perfil')
  async perfil(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.authService.obtenerPerfil(usuario.id);
  }
}
