import { Controller, Get, Query } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { Roles } from '../comun/decoradores/roles.decorador';
import { ReportesService } from './reportes.service';
import { ReportesFinancierosService } from './reportes-financieros.service';
import { FiltrosFinancierosDto, FiltrosFlujoDto } from './dto/filtros-financieros.dto';

@Roles(RolUsuario.ADMINISTRADOR)
@Controller('reportes')
export class ReportesController {
  constructor(
    private reportesService: ReportesService,
    private reportesFinancierosService: ReportesFinancierosService,
  ) {}

  @Get('resumen')
  resumen() {
    return this.reportesService.resumen();
  }

  @Get('solicitudes-por-estado')
  solicitudesPorEstado() {
    return this.reportesService.solicitudesPorEstado();
  }

  @Get('finanzas/resumen')
  resumenFinanciero(@Query() filtros: FiltrosFinancierosDto) {
    return this.reportesFinancierosService.resumen(filtros);
  }

  @Get('finanzas/periodos')
  porPeriodo(@Query() filtros: FiltrosFinancierosDto) {
    return this.reportesFinancierosService.porPeriodo(filtros);
  }

  @Get('finanzas/servicios')
  porServicio(@Query() filtros: FiltrosFinancierosDto) {
    return this.reportesFinancierosService.porServicio(filtros);
  }

  @Get('finanzas/personal')
  personal() {
    return this.reportesFinancierosService.personal();
  }

  @Get('finanzas/liquidaciones')
  liquidacionesPorPeriodo(@Query() filtros: FiltrosFinancierosDto) {
    return this.reportesFinancierosService.liquidacionesPorPeriodo(filtros);
  }

  @Get('finanzas/flujo')
  flujo(@Query() filtros: FiltrosFlujoDto) {
    return this.reportesFinancierosService.flujo(filtros);
  }
}
