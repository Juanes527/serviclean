import { Module } from '@nestjs/common';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { CalificacionesController } from './calificaciones.controller';
import { CalificacionesService } from './calificaciones.service';

@Module({
  imports: [NotificacionesModule],
  controllers: [CalificacionesController],
  providers: [CalificacionesService],
})
export class CalificacionesModule {}
