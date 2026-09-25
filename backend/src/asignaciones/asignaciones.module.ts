import { Module } from '@nestjs/common';
import { DisponibilidadModule } from '../disponibilidad/disponibilidad.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { AsignacionesController } from './asignaciones.controller';
import { AsignacionesService } from './asignaciones.service';

@Module({
  imports: [DisponibilidadModule, NotificacionesModule],
  controllers: [AsignacionesController],
  providers: [AsignacionesService],
  exports: [AsignacionesService],
})
export class AsignacionesModule {}
