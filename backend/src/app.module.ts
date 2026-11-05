import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { SupabaseModule } from './supabase/supabase.module';
import { JwtAuthGuard } from './comun/guards/jwt-auth.guard';
import { RolesGuard } from './comun/guards/roles.guard';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { ServiciosModule } from './servicios/servicios.module';
import { SolicitudesModule } from './solicitudes/solicitudes.module';
import { AsignacionesModule } from './asignaciones/asignaciones.module';
import { AgendaModule } from './agenda/agenda.module';
import { DisponibilidadModule } from './disponibilidad/disponibilidad.module';
import { PagosModule } from './pagos/pagos.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { CalificacionesModule } from './calificaciones/calificaciones.module';
import { ReportesModule } from './reportes/reportes.module';
import { WalletModule } from './wallet/wallet.module';
import { LiquidacionesModule } from './liquidaciones/liquidaciones.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    SupabaseModule,
    AuthModule,
    UsuariosModule,
    ServiciosModule,
    SolicitudesModule,
    AsignacionesModule,
    AgendaModule,
    DisponibilidadModule,
    PagosModule,
    NotificacionesModule,
    CalificacionesModule,
    ReportesModule,
    WalletModule,
    LiquidacionesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
