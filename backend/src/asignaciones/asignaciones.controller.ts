import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { Roles } from '../comun/decoradores/roles.decorador';
import { UsuarioActual, UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';
import { AsignacionesService } from './asignaciones.service';
import { ReasignarDto } from './dto/reasignar.dto';

@Controller('asignaciones')
export class AsignacionesController {
  constructor(private asignacionesService: AsignacionesService) {}

  @Roles(RolUsuario.PERSONAL_ASEO)
  @Get('mias')
  listarMias(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.asignacionesService.listarPorPersonal(usuario.id);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Get()
  listarTodas() {
    return this.asignacionesService.listarTodas();
  }

  @Roles(RolUsuario.PERSONAL_ASEO)
  @Patch(':id/aceptar')
  aceptar(@UsuarioActual() usuario: UsuarioAutenticado, @Param('id') id: string) {
    return this.asignacionesService.aceptar(usuario.id, id);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Patch(':id/reasignar')
  reasignar(@Param('id') id: string, @Body() datos: ReasignarDto) {
    return this.asignacionesService.reasignar(id, datos);
  }
}
