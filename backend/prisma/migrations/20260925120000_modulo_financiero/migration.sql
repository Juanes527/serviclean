-- CreateEnum
CREATE TYPE "TipoMovimientoWallet" AS ENUM ('INGRESO_SERVICIO', 'PAGO_EFECTIVO', 'BONIFICACION', 'DESCUENTO', 'AJUSTE', 'LIQUIDACION');

-- CreateEnum
CREATE TYPE "EstadoLiquidacion" AS ENUM ('PENDIENTE', 'PAGADA', 'CANCELADA');

-- AlterEnum
ALTER TYPE "EstadoPago" ADD VALUE 'REEMBOLSADO';

-- AlterEnum
ALTER TYPE "MetodoPago" ADD VALUE 'SIMULADO_TARJETA';

-- AlterTable
ALTER TABLE "pagos" ADD COLUMN     "fechaActualizacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "montoComision" DECIMAL(10,2),
ADD COLUMN     "montoPersonal" DECIMAL(10,2),
ADD COLUMN     "porcentajeComision" DECIMAL(5,2),
ADD COLUMN     "referencia" TEXT,
ADD COLUMN     "tarjetaMarca" TEXT,
ADD COLUMN     "tarjetaUltimos4" VARCHAR(4);

-- Conserva los pagos existentes: se les asigna una referencia única derivada de su id.
UPDATE "pagos" SET "referencia" = 'PAY-' || UPPER(SUBSTRING(REPLACE("id", '-', '') FROM 1 FOR 10)) WHERE "referencia" IS NULL;
ALTER TABLE "pagos" ALTER COLUMN "referencia" SET NOT NULL;

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "personalId" TEXT NOT NULL,
    "saldo" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_wallet" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "walletId" TEXT NOT NULL,
    "tipo" "TipoMovimientoWallet" NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "saldoAnterior" DECIMAL(12,2) NOT NULL,
    "saldoPosterior" DECIMAL(12,2) NOT NULL,
    "solicitudId" TEXT,
    "pagoId" TEXT,
    "liquidacionId" TEXT,
    "autorizadoPorId" TEXT,
    "claveIdempotencia" TEXT,
    "metadata" JSONB,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidaciones" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "walletId" TEXT NOT NULL,
    "periodoInicio" TIMESTAMP(3) NOT NULL,
    "periodoFin" TIMESTAMP(3) NOT NULL,
    "saldoInicial" DECIMAL(12,2) NOT NULL,
    "ingresos" DECIMAL(12,2) NOT NULL,
    "descuentos" DECIMAL(12,2) NOT NULL,
    "ajustes" DECIMAL(12,2) NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "movimientoDesde" INTEGER NOT NULL,
    "movimientoHasta" INTEGER NOT NULL,
    "estado" "EstadoLiquidacion" NOT NULL DEFAULT 'PENDIENTE',
    "observaciones" TEXT,
    "creadaPorId" TEXT NOT NULL,
    "pagadaPorId" TEXT,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaPago" TIMESTAMP(3),
    "fechaCancelacion" TIMESTAMP(3),

    CONSTRAINT "liquidaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallets_personalId_key" ON "wallets"("personalId");

-- CreateIndex
CREATE UNIQUE INDEX "movimientos_wallet_numero_key" ON "movimientos_wallet"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "movimientos_wallet_liquidacionId_key" ON "movimientos_wallet"("liquidacionId");

-- CreateIndex
CREATE UNIQUE INDEX "movimientos_wallet_claveIdempotencia_key" ON "movimientos_wallet"("claveIdempotencia");

-- CreateIndex
CREATE INDEX "movimientos_wallet_walletId_numero_idx" ON "movimientos_wallet"("walletId", "numero");

-- CreateIndex
CREATE INDEX "movimientos_wallet_tipo_fecha_idx" ON "movimientos_wallet"("tipo", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "liquidaciones_numero_key" ON "liquidaciones"("numero");

-- CreateIndex
CREATE INDEX "liquidaciones_walletId_estado_idx" ON "liquidaciones"("walletId", "estado");

-- CreateIndex
CREATE INDEX "liquidaciones_estado_fechaCreacion_idx" ON "liquidaciones"("estado", "fechaCreacion");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_referencia_key" ON "pagos"("referencia");

-- CreateIndex
CREATE INDEX "pagos_estado_fecha_idx" ON "pagos"("estado", "fecha");

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_wallet" ADD CONSTRAINT "movimientos_wallet_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_wallet" ADD CONSTRAINT "movimientos_wallet_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitudes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_wallet" ADD CONSTRAINT "movimientos_wallet_pagoId_fkey" FOREIGN KEY ("pagoId") REFERENCES "pagos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_wallet" ADD CONSTRAINT "movimientos_wallet_liquidacionId_fkey" FOREIGN KEY ("liquidacionId") REFERENCES "liquidaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_wallet" ADD CONSTRAINT "movimientos_wallet_autorizadoPorId_fkey" FOREIGN KEY ("autorizadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidaciones" ADD CONSTRAINT "liquidaciones_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidaciones" ADD CONSTRAINT "liquidaciones_creadaPorId_fkey" FOREIGN KEY ("creadaPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidaciones" ADD CONSTRAINT "liquidaciones_pagadaPorId_fkey" FOREIGN KEY ("pagadaPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Crea la wallet (saldo 0) de cada integrante del personal de aseo existente.
INSERT INTO "wallets" ("id", "personalId", "saldo", "fechaCreacion", "fechaActualizacion")
SELECT gen_random_uuid()::text, u."id", 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "usuarios" u
WHERE u."rol" = 'PERSONAL_ASEO'
  AND NOT EXISTS (SELECT 1 FROM "wallets" w WHERE w."personalId" = u."id");

-- Ledger inmutable: los movimientos de wallet no se pueden modificar ni eliminar.
-- Las correcciones se registran como nuevos movimientos (AJUSTE, DESCUENTO, BONIFICACION).
CREATE OR REPLACE FUNCTION impedir_cambios_movimientos_wallet() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Los movimientos de wallet son inmutables: registre un movimiento de ajuste en su lugar.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER movimientos_wallet_inmutables
BEFORE UPDATE OR DELETE ON "movimientos_wallet"
FOR EACH ROW EXECUTE FUNCTION impedir_cambios_movimientos_wallet();
