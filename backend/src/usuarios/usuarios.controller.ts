import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { Roles } from '../comun/decoradores/roles.decorador';
import { UsuarioActual, UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';
import { UsuariosService } from './usuarios.service';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto';
import { ActualizarEstadoDto } from './dto/actualizar-estado.dto';

@Controller('usuarios')
export class UsuariosController {
  constructor(private usuariosService: UsuariosService) {}

  @Roles(RolUsuario.ADMINISTRADOR)
  @Get()
  listar(@Query('rol') rol?: RolUsuario) {
    return this.usuariosService.listar(rol);
  }

  @Patch('perfil')
  actualizarPerfil(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() datos: ActualizarPerfilDto,
  ) {
    return this.usuariosService.actualizarPerfil(usuario.id, datos);
  }

  @Patch('cambiar-contrasena')
  cambiarContrasena(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() datos: CambiarContrasenaDto,
  ) {
    return this.usuariosService.cambiarContrasena(usuario.id, datos);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Get(':id')
  obtenerPorId(@Param('id') id: string) {
    return this.usuariosService.obtenerPorId(id);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Patch(':id/estado')
  actualizarEstado(@Param('id') id: string, @Body() datos: ActualizarEstadoDto) {
    return this.usuariosService.actualizarEstado(id, datos);
  }
}
