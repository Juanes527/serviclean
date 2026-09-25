import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { Roles } from '../comun/decoradores/roles.decorador';
import { UsuarioActual, UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';
import { WalletService } from './wallet.service';
import { CrearAjusteDto } from './dto/crear-ajuste.dto';
import { FiltrosMovimientosDto } from './dto/filtros-movimientos.dto';

/**
 * El personal solo puede CONSULTAR su propia wallet. Ningún endpoint permite al personal
 * crear movimientos ni modificar su saldo: los cambios provienen de pagos, liquidaciones
 * o ajustes autorizados por un administrador.
 */
@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Roles(RolUsuario.PERSONAL_ASEO)
  @Get('mia')
  miWallet(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.walletService.resumen(usuario.id);
  }

  @Roles(RolUsuario.PERSONAL_ASEO)
  @Get('mia/movimientos')
  misMovimientos(@UsuarioActual() usuario: UsuarioAutenticado, @Query() filtros: FiltrosMovimientosDto) {
    // El filtro por trabajador se ignora: siempre se consultan los movimientos propios.
    return this.walletService.movimientosDePersonal(usuario.id, { ...filtros, personalId: undefined });
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Get()
  listar() {
    return this.walletService.listarWallets();
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Get('movimientos')
  movimientos(@Query() filtros: FiltrosMovimientosDto) {
    return this.walletService.movimientosGenerales(filtros);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Get('personal/:personalId')
  walletDePersonal(@Param('personalId') personalId: string) {
    return this.walletService.resumen(personalId);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Get('personal/:personalId/movimientos')
  movimientosDePersonal(@Param('personalId') personalId: string, @Query() filtros: FiltrosMovimientosDto) {
    return this.walletService.movimientosDePersonal(personalId, filtros);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Post('personal/:personalId/ajustes')
  crearAjuste(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('personalId') personalId: string,
    @Body() datos: CrearAjusteDto,
  ) {
    return this.walletService.crearAjuste(usuario.id, personalId, datos);
  }
}
