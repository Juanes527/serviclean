import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { EstadoSolicitud, RolUsuario } from '@prisma/client';
import { Roles } from '../comun/decoradores/roles.decorador';
import { UsuarioActual, UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';
import { SolicitudesService } from './solicitudes.service';
import { CrearSolicitudDto } from './dto/crear-solicitud.dto';
import { ActualizarEstadoSolicitudDto } from './dto/actualizar-estado-solicitud.dto';

@Controller('solicitudes')
export class SolicitudesController {
  constructor(private solicitudesService: SolicitudesService) {}

  @Roles(RolUsuario.CLIENTE)
  @Post()
  crear(@UsuarioActual() usuario: UsuarioAutenticado, @Body() datos: CrearSolicitudDto) {
    return this.solicitudesService.crear(usuario.id, datos);
  }

  @Roles(RolUsuario.CLIENTE)
  @Get('mias')
  misSolicitudes(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.solicitudesService.misSolicitudes(usuario.id);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Get()
  listarTodas(@Query('estado') estado?: EstadoSolicitud) {
    return this.solicitudesService.listarTodas(estado);
  }

  @Get(':id')
  obtenerPorId(@UsuarioActual() usuario: UsuarioAutenticado, @Param('id') id: string) {
    return this.solicitudesService.obtenerPorId(id, usuario);
  }

  @Patch(':id/cancelar')
  cancelar(@UsuarioActual() usuario: UsuarioAutenticado, @Param('id') id: string) {
    return this.solicitudesService.cancelar(id, usuario);
  }

  @Roles(RolUsuario.PERSONAL_ASEO, RolUsuario.ADMINISTRADOR)
  @Patch(':id/estado')
  actualizarEstado(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() datos: ActualizarEstadoSolicitudDto,
  ) {
    return this.solicitudesService.actualizarEstado(id, usuario, datos);
  }
}
