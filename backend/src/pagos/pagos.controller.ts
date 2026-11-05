import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { Roles } from '../comun/decoradores/roles.decorador';
import { UsuarioActual, UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';
import { PagosService } from './pagos.service';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';
import { ActualizarEstadoPagoDto } from './dto/actualizar-estado-pago.dto';
import { FiltrosPagosDto } from './dto/filtros-pagos.dto';

@Controller('pagos')
export class PagosController {
  constructor(private pagosService: PagosService) {}

  @Roles(RolUsuario.CLIENTE)
  @Post()
  registrar(@UsuarioActual() usuario: UsuarioAutenticado, @Body() datos: RegistrarPagoDto) {
    return this.pagosService.registrar(usuario.id, datos);
  }

  @Roles(RolUsuario.CLIENTE)
  @Get('mios')
  misPagos(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.pagosService.misPagos(usuario.id);
  }

  /** El personal asignado marca como recibido el efectivo que le entregó el cliente. */
  @Roles(RolUsuario.PERSONAL_ASEO)
  @Patch('solicitud/:solicitudId/efectivo-recibido')
  confirmarEfectivoRecibido(@UsuarioActual() usuario: UsuarioAutenticado, @Param('solicitudId') solicitudId: string) {
    return this.pagosService.confirmarEfectivoRecibido(usuario.id, solicitudId);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Get()
  listarTodos(@Query() filtros: FiltrosPagosDto) {
    return this.pagosService.listarTodos(filtros);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Patch(':id/estado')
  actualizarEstado(@Param('id') id: string, @Body() datos: ActualizarEstadoPagoDto) {
    return this.pagosService.actualizarEstado(id, datos);
  }
}
