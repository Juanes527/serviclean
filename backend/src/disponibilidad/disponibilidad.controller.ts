import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { Roles } from '../comun/decoradores/roles.decorador';
import { UsuarioActual, UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';
import { DisponibilidadService } from './disponibilidad.service';
import { CrearDisponibilidadDto } from './dto/crear-disponibilidad.dto';

@Roles(RolUsuario.PERSONAL_ASEO)
@Controller('disponibilidad')
export class DisponibilidadController {
  constructor(private disponibilidadService: DisponibilidadService) {}

  @Post()
  crear(@UsuarioActual() usuario: UsuarioAutenticado, @Body() datos: CrearDisponibilidadDto) {
    return this.disponibilidadService.crear(usuario.id, datos);
  }

  @Get('mia')
  listarMia(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.disponibilidadService.listarPorPersonal(usuario.id);
  }

  @Delete(':id')
  eliminar(@UsuarioActual() usuario: UsuarioAutenticado, @Param('id') id: string) {
    return this.disponibilidadService.eliminar(usuario.id, id);
  }
}
