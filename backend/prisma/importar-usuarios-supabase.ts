/**
 * Enlaza los usuarios existentes con Supabase Auth: crea su cuenta conservando el hash bcrypt actual
 * (siguen entrando con la misma contraseña) y guarda el id en usuarios.auth_id. Es idempotente.
 *
 * Uso (aplica a la base de DATABASE_URL):  npm run importar:usuarios
 * En producción Render lo ejecuta al iniciar, justo después de las migraciones (ver render.yaml).
 */
import { PrismaClient } from '@prisma/client';
import { asegurarCuenta, clienteAdminSupabase, cuentasExistentes } from './cuentas-supabase';

try {
  process.loadEnvFile(); // Las variables ya definidas en el entorno tienen prioridad.
} catch {
  // Sin .env: se usan solo las variables del entorno.
}

async function main() {
  const prisma = new PrismaClient();
  const supabase = clienteAdminSupabase();
  try {
    const pendientes = await prisma.usuario.findMany({ where: { authId: null }, orderBy: { fechaCreacion: 'asc' } });
    console.log(`Usuarios sin cuenta de Supabase Auth: ${pendientes.length}`);
    if (pendientes.length === 0) return;
    const existentes = await cuentasExistentes(supabase);
    const fallidos: string[] = [];

    for (const usuario of pendientes) {
      try {
        if (!usuario.contrasena && !existentes.has(usuario.correo.toLowerCase())) {
          throw new Error('no tiene contraseña para importar');
        }
        const { authId, creada } = await asegurarCuenta(supabase, existentes, usuario.correo, {
          hashBcrypt: usuario.contrasena ?? '',
        });
        await prisma.usuario.update({ where: { id: usuario.id }, data: { authId } });
        console.log(`  ✓ ${usuario.correo} ${creada ? '(cuenta creada)' : '(cuenta existente, contraseña sin cambios)'}`);
      } catch (error) {
        fallidos.push(usuario.correo);
        console.error(`  ✗ ${usuario.correo}: ${(error as Error).message}`);
      }
    }

    if (fallidos.length > 0) {
      console.error(`\n${fallidos.length} usuario(s) no se importaron. Corrige el problema y vuelve a ejecutar el script.`);
      process.exitCode = 1;
    } else {
      console.log('\nTodos los usuarios están enlazados con Supabase Auth.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
