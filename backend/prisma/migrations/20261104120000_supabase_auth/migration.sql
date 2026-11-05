-- Supabase Auth reemplaza la autenticación propia (contraseñas, recuperación y verificación de correo).

-- Enlace de cada usuario con su cuenta en Supabase Auth (auth.users.id).
ALTER TABLE "usuarios" ADD COLUMN "auth_id" UUID;
CREATE UNIQUE INDEX "usuarios_auth_id_key" ON "usuarios"("auth_id");

-- El hash bcrypt se conserva (ahora opcional) para importar los usuarios existentes a Supabase Auth.
-- Se eliminará en una migración posterior, cuando todos los usuarios tengan auth_id.
ALTER TABLE "usuarios" ALTER COLUMN "contrasena" DROP NOT NULL;

-- Supabase Auth gestiona los enlaces de recuperación.
DROP TABLE "tokens_recuperacion";
