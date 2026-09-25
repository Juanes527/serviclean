import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolUsuario } from '@prisma/client';
import { CLAVE_ROLES } from '../decoradores/roles.decorador';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const rolesRequeridos = this.reflector.getAllAndOverride<RolUsuario[]>(CLAVE_ROLES, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (!rolesRequeridos || rolesRequeridos.length === 0) {
      return true;
    }
    const { user } = contexto.switchToHttp().getRequest();
    if (!user || !rolesRequeridos.includes(user.rol)) {
      throw new ForbiddenException('No tiene permisos para acceder a este recurso.');
    }
    return true;
  }
}
