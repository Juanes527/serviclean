-- Habilita Row Level Security en todas las tablas del esquema public.
-- Sin políticas definidas, los roles de la API de Supabase (anon, authenticated)
-- no pueden leer ni escribir. El backend (Prisma) se conecta como dueño de las
-- tablas, por lo que no se ve afectado.

ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usuarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tokens_recuperacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "servicios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "solicitudes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "asignaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "disponibilidad" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pagos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notificaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calificaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "wallets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "movimientos_wallet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "liquidaciones" ENABLE ROW LEVEL SECURITY;
