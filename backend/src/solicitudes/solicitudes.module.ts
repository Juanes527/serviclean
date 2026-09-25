import { Module } from '@nestjs/common';
import { AsignacionesModule } from '../asignaciones/asignaciones.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { PagosModule } from '../pagos/pagos.module';
import { WalletModule } from '../wallet/wallet.module';
import { SolicitudesController } from './solicitudes.controller';
import { SolicitudesService } from './solicitudes.service';

@Module({
  imports: [AsignacionesModule, NotificacionesModule, PagosModule, WalletModule],
  controllers: [SolicitudesController],
  providers: [SolicitudesService],
  exports: [SolicitudesService],
})
export class SolicitudesModule {}
