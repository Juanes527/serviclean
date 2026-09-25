import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { Roles } from '../comun/decoradores/roles.decorador';
import { UsuarioActual, UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';
import { LiquidacionesService } from './liquidaciones.service';
import { CrearLiquidacionDto } from './dto/crear-liquidacion.dto';
import { FiltrosLiquidacionesDto } from './dto/filtros-liquidaciones.dto';

@Controller('liquidaciones')
export class LiquidacionesController {
  constructor(private liquidacionesService: LiquidacionesService) {}

  @Roles(RolUsuario.PERSONAL_ASEO)
  @Get('mias')
  mias(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.liquidacionesService.mias(usuario.id);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Get()
  listar(@Query() filtros: FiltrosLiquidacionesDto) {
    return this.liquidacionesService.listar(filtros);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Get('vista-previa/:personalId')
  vistaPrevia(@Param('personalId') personalId: string) {
    return this.liquidacionesService.vistaPrevia(personalId);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Post()
  crear(@UsuarioActual() usuario: UsuarioAutenticado, @Body() datos: CrearLiquidacionDto) {
    return this.liquidacionesService.crear(usuario.id, datos);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Post('generar-periodo')
  generarPeriodo(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.liquidacionesService.generarPeriodo(usuario.id);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Patch(':id/pagar')
  pagar(@UsuarioActual() usuario: UsuarioAutenticado, @Param('id') id: string) {
    return this.liquidacionesService.pagar(usuario.id, id);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Patch(':id/cancelar')
  cancelar(@Param('id') id: string) {
    return this.liquidacionesService.cancelar(id);
  }

  /** Administrador o el propio trabajador (validado en el servicio). */
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.PERSONAL_ASEO)
  @Get(':id')
  obtener(@UsuarioActual() usuario: UsuarioAutenticado, @Param('id') id: string) {
    return this.liquidacionesService.obtener(id, usuario);
  }
}
