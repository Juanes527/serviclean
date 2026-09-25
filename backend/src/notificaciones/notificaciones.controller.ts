import { Controller, Get, Param, Patch } from '@nestjs/common';
import { UsuarioActual, UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';
import { NotificacionesService } from './notificaciones.service';

@Controller('notificaciones')
export class NotificacionesController {
  constructor(private notificacionesService: NotificacionesService) {}

  @Get('mias')
  listarMias(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.notificacionesService.listarPorUsuario(usuario.id);
  }

  @Get('no-leidas/contador')
  contarNoLeidas(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.notificacionesService.contarNoLeidas(usuario.id);
  }

  @Patch(':id/leer')
  marcarComoLeida(@UsuarioActual() usuario: UsuarioAutenticado, @Param('id') id: string) {
    return this.notificacionesService.marcarComoLeida(usuario.id, id);
  }

  @Patch('leer-todas')
  marcarTodasComoLeidas(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.notificacionesService.marcarTodasComoLeidas(usuario.id);
  }
}
