import { Module } from '@nestjs/common';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { WalletModule } from '../wallet/wallet.module';
import { LiquidacionesController } from './liquidaciones.controller';
import { LiquidacionesService } from './liquidaciones.service';

@Module({
  imports: [WalletModule, NotificacionesModule],
  controllers: [LiquidacionesController],
  providers: [LiquidacionesService],
})
export class LiquidacionesModule {}
