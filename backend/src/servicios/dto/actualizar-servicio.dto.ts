import { PartialType } from '@nestjs/mapped-types';
import { CrearServicioDto } from './crear-servicio.dto';

export class ActualizarServicioDto extends PartialType(CrearServicioDto) {}
