import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, MaxLength, NotEquals } from 'class-validator';

export const TIPOS_AJUSTE = ['AJUSTE', 'BONIFICACION', 'DESCUENTO'] as const;

export class CrearAjusteDto {
  @IsIn(TIPOS_AJUSTE, { message: 'El tipo de ajuste debe ser AJUSTE, BONIFICACION o DESCUENTO.' })
  tipo: (typeof TIPOS_AJUSTE)[number];

  /** Bonificación y descuento usan el valor absoluto; un AJUSTE puede ser positivo o negativo. */
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto debe ser un número con máximo dos decimales.' })
  @NotEquals(0, { message: 'El monto debe ser distinto de cero.' })
  monto: number;

  @IsString()
  @IsNotEmpty({ message: 'Describa el motivo del ajuste.' })
  @MaxLength(200, { message: 'El motivo no puede superar 200 caracteres.' })
  concepto: string;

  /** Generada por el cliente al abrir el formulario: evita registrar dos veces el mismo ajuste. */
  @IsOptional()
  @IsUUID('4', { message: 'La clave de idempotencia no es válida.' })
  claveIdempotencia?: string;
}
