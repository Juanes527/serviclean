import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { Publico } from '../comun/decoradores/publico.decorador';
import { Roles } from '../comun/decoradores/roles.decorador';
import { ServiciosService } from './servicios.service';
import { CrearServicioDto } from './dto/crear-servicio.dto';
import { ActualizarServicioDto } from './dto/actualizar-servicio.dto';

@Controller('servicios')
export class ServiciosController {
  constructor(private serviciosService: ServiciosService) {}

  @Publico()
  @Get()
  listar(@Query('todos') todos?: string) {
    return this.serviciosService.listar(todos !== 'true');
  }

  @Publico()
  @Get(':id')
  obtenerPorId(@Param('id') id: string) {
    return this.serviciosService.obtenerPorId(id);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Post()
  crear(@Body() datos: CrearServicioDto) {
    return this.serviciosService.crear(datos);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() datos: ActualizarServicioDto) {
    return this.serviciosService.actualizar(id, datos);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Delete(':id')
  eliminar(@Param('id') id: string) {
    return this.serviciosService.eliminar(id);
  }
}
