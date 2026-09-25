import { Controller, Get } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { Roles } from '../comun/decoradores/roles.decorador';
import { UsuarioActual, UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';
import { AgendaService } from './agenda.service';

@Controller('agenda')
export class AgendaController {
  constructor(private agendaService: AgendaService) {}

  @Roles(RolUsuario.CLIENTE)
  @Get('cliente')
  agendaCliente(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.agendaService.agendaCliente(usuario.id);
  }

  @Roles(RolUsuario.PERSONAL_ASEO)
  @Get('personal')
  agendaPersonal(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.agendaService.agendaPersonal(usuario.id);
  }
}
