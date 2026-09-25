import { Body, Controller, Get, Post } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { Roles } from '../comun/decoradores/roles.decorador';
import { UsuarioActual, UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';
import { CalificacionesService } from './calificaciones.service';
import { CrearCalificacionDto } from './dto/crear-calificacion.dto';

@Controller('calificaciones')
export class CalificacionesController {
  constructor(private calificacionesService: CalificacionesService) {}

  @Roles(RolUsuario.CLIENTE)
  @Post()
  crear(@UsuarioActual() usuario: UsuarioAutenticado, @Body() datos: CrearCalificacionDto) {
    return this.calificacionesService.crear(usuario.id, datos);
  }

  @Roles(RolUsuario.PERSONAL_ASEO)
  @Get('mi-promedio')
  miPromedio(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.calificacionesService.promedioPersonal(usuario.id);
  }
}
