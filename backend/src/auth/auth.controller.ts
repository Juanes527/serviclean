import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Publico } from '../comun/decoradores/publico.decorador';
import { UsuarioActual, UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';
import { AuthService } from './auth.service';
import { RegistroDto } from './dto/registro.dto';
import { IniciarSesionDto } from './dto/iniciar-sesion.dto';
import { RecuperarContrasenaDto } from './dto/recuperar-contrasena.dto';
import { RestablecerContrasenaDto } from './dto/restablecer-contrasena.dto';

const NOMBRE_COOKIE = 'serviclean_token';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  private establecerCookie(respuesta: Response, token: string) {
    respuesta.cookie(NOMBRE_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
  }

  @Publico()
  @Post('registro')
  async registro(@Body() datos: RegistroDto, @Res({ passthrough: true }) respuesta: Response) {
    const resultado = await this.authService.registrar(datos);
    this.establecerCookie(respuesta, resultado.token);
    return resultado;
  }

  @Publico()
  @Post('login')
  async login(@Body() datos: IniciarSesionDto, @Res({ passthrough: true }) respuesta: Response) {
    const resultado = await this.authService.iniciarSesion(datos);
    this.establecerCookie(respuesta, resultado.token);
    return resultado;
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) respuesta: Response) {
    respuesta.clearCookie(NOMBRE_COOKIE);
    return { mensaje: 'Sesión cerrada correctamente.' };
  }

  @Publico()
  @Post('recuperar-contrasena')
  async recuperarContrasena(@Body() datos: RecuperarContrasenaDto) {
    return this.authService.solicitarRecuperacion(datos);
  }

  @Publico()
  @Post('restablecer-contrasena')
  async restablecerContrasena(@Body() datos: RestablecerContrasenaDto) {
    return this.authService.restablecerContrasena(datos);
  }

  @Get('perfil')
  async perfil(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.authService.obtenerPerfil(usuario.id);
  }
}
