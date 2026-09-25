import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let servicio: AuthService;
  let prismaSimulado: any;
  let usuarios: any[];

  beforeEach(() => {
    usuarios = [];
    prismaSimulado = {
      usuario: {
        findUnique: jest.fn(({ where }: any) => usuarios.find((u) => u.correo === where.correo || u.id === where.id) ?? null),
        create: jest.fn(({ data }: any) => {
          const usuario = { id: String(usuarios.length + 1), estado: 'ACTIVO', ...data };
          usuarios.push(usuario);
          return usuario;
        }),
      },
      tokenRecuperacion: { create: jest.fn(), findUnique: jest.fn() },
      $transaction: jest.fn(),
    };
    const jwtService = new JwtService({ secret: 'clave-de-prueba' });
    servicio = new AuthService(prismaSimulado, jwtService);
  });

  it('registra un usuario nuevo y retorna un token', async () => {
    const resultado = await servicio.registrar({
      nombre: 'Ana',
      apellido: 'Pérez',
      correo: 'ana@correo.com',
      telefono: '3000000000',
      contrasena: '12345678',
      confirmarContrasena: '12345678',
      rol: 'CLIENTE',
    });

    expect(resultado.token).toBeDefined();
    expect(resultado.usuario.correo).toBe('ana@correo.com');
  });

  it('rechaza el registro si el correo ya existe', async () => {
    usuarios.push({ id: '1', correo: 'ana@correo.com', contrasena: 'hash', rol: 'CLIENTE', estado: 'ACTIVO' });

    await expect(
      servicio.registrar({
        nombre: 'Ana',
        apellido: 'Pérez',
        correo: 'ana@correo.com',
        telefono: '3000000000',
        contrasena: '12345678',
        confirmarContrasena: '12345678',
        rol: 'CLIENTE',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('rechaza el inicio de sesión con contraseña incorrecta', async () => {
    const contrasenaHash = await bcrypt.hash('correcta123', 10);
    usuarios.push({ id: '1', correo: 'ana@correo.com', contrasena: contrasenaHash, rol: 'CLIENTE', estado: 'ACTIVO' });

    await expect(servicio.iniciarSesion({ correo: 'ana@correo.com', contrasena: 'incorrecta' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('permite el inicio de sesión con credenciales correctas', async () => {
    const contrasenaHash = await bcrypt.hash('correcta123', 10);
    usuarios.push({ id: '1', correo: 'ana@correo.com', contrasena: contrasenaHash, rol: 'CLIENTE', estado: 'ACTIVO' });

    const resultado = await servicio.iniciarSesion({ correo: 'ana@correo.com', contrasena: 'correcta123' });
    expect(resultado.usuario.correo).toBe('ana@correo.com');
  });
});
