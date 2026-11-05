import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { COOKIE_ACCESO } from '../../auth/cookies';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { CLAVE_PUBLICO } from '../decoradores/publico.decorador';
import { UsuarioAutenticado } from '../decoradores/usuario-actual.decorador';

/**
 * Verifica el token de acceso de Supabase (cookie HttpOnly o encabezado Bearer) y carga el usuario
 * de ServiClean enlazado. El rol y el estado salen siempre de la base de datos, no del token.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private supabase: SupabaseService,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const esPublico = this.reflector.getAllAndOverride<boolean>(CLAVE_PUBLICO, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (esPublico) {
      return true;
    }

    const peticion = contexto.switchToHttp().getRequest<Request & { user?: UsuarioAutenticado }>();
    const token = extraerToken(peticion);
    if (!token) {
      throw new UnauthorizedException('Debe iniciar sesión.');
    }

    const authId = await this.verificarToken(token);
    if (!authId) {
      throw new UnauthorizedException('La sesión expiró. Inicie sesión de nuevo.');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { authId },
      select: { id: true, correo: true, rol: true, estado: true },
    });
    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }
    if (usuario.estado === 'INACTIVO') {
      throw new UnauthorizedException('Este usuario se encuentra inactivo. Contacte al administrador.');
    }

    peticion.user = { id: usuario.id, correo: usuario.correo, rol: usuario.rol };
    return true;
  }

  /** Id de Supabase Auth del token, o null si es inválido o expiró (getClaims lanza con tokens malformados). */
  private async verificarToken(token: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabase.admin.auth.getClaims(token);
      return error ? null : (data?.claims?.sub ?? null);
    } catch {
      return null;
    }
  }
}

function extraerToken(peticion: Request): string | null {
  const deCookie = peticion.cookies?.[COOKIE_ACCESO];
  if (deCookie) return deCookie;
  const [tipo, valor] = peticion.headers.authorization?.split(' ') ?? [];
  return tipo === 'Bearer' && valor ? valor : null;
}
