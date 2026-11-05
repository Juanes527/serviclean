import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService, CODIGO_CORREO_NO_VERIFICADO } from './auth.service';

const DATOS_REGISTRO = {
  nombre: 'Ana',
  apellido: 'Pérez',
  correo: 'Ana@Correo.com',
  telefono: '3000000000',
  contrasena: '12345678',
  confirmarContrasena: '12345678',
  rol: 'CLIENTE' as const,
};

const sesion = (authId: string) => ({ access_token: 'acceso', refresh_token: 'refresco', user: { id: authId } });

describe('AuthService', () => {
  let servicio: AuthService;
  let usuarios: any[];
  let prismaSimulado: any;
  let authPublico: Record<string, jest.Mock>;
  let authAdmin: Record<string, jest.Mock>;

  beforeEach(() => {
    usuarios = [];
    prismaSimulado = {
      usuario: {
        findUnique: jest.fn(({ where }: any) =>
          usuarios.find((u) => (where.correo && u.correo === where.correo) || (where.authId && u.authId === where.authId)) ?? null,
        ),
        create: jest.fn(({ data }: any) => {
          const usuario = { id: String(usuarios.length + 1), estado: 'ACTIVO', contrasena: null, ...data };
          usuarios.push(usuario);
          return usuario;
        }),
      },
    };
    authPublico = { signUp: jest.fn(), signInWithPassword: jest.fn() };
    authAdmin = { deleteUser: jest.fn(), signOut: jest.fn().mockResolvedValue({ error: null }) };
    const supabaseSimulado: any = {
      publico: () => ({ auth: authPublico }),
      admin: { auth: { admin: authAdmin } },
    };
    servicio = new AuthService(prismaSimulado, supabaseSimulado, new ConfigService({ FRONTEND_URL: 'http://localhost:3000' }));
  });

  it('registra la cuenta en Supabase y el usuario enlazado; pide verificar el correo', async () => {
    authPublico.signUp.mockResolvedValue({ data: { user: { id: 'auth-1', identities: [{}] }, session: null }, error: null });

    const resultado = await servicio.registrar(DATOS_REGISTRO);

    expect(resultado).toEqual({ requiereVerificacion: true, correo: 'ana@correo.com' });
    expect(authPublico.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ options: { emailRedirectTo: 'http://localhost:3000/verificar-correo' } }),
    );
    expect(usuarios[0]).toMatchObject({ authId: 'auth-1', correo: 'ana@correo.com', rol: 'CLIENTE' });
  });

  it('rechaza el registro si el correo ya existe', async () => {
    usuarios.push({ id: '1', correo: 'ana@correo.com' });
    await expect(servicio.registrar(DATOS_REGISTRO)).rejects.toThrow(ConflictException);
    expect(authPublico.signUp).not.toHaveBeenCalled();
  });

  it('borra la cuenta de Supabase si no se puede crear el usuario de ServiClean', async () => {
    authPublico.signUp.mockResolvedValue({ data: { user: { id: 'auth-1', identities: [{}] }, session: null }, error: null });
    prismaSimulado.usuario.create.mockRejectedValue(new Error('fallo de base de datos'));

    await expect(servicio.registrar(DATOS_REGISTRO)).rejects.toThrow('fallo de base de datos');
    expect(authAdmin.deleteUser).toHaveBeenCalledWith('auth-1');
  });

  it('rechaza el inicio de sesión con contraseña incorrecta', async () => {
    authPublico.signInWithPassword.mockResolvedValue({ data: {}, error: { code: 'invalid_credentials' } });
    await expect(servicio.iniciarSesion({ correo: 'ana@correo.com', contrasena: 'x' })).rejects.toThrow(UnauthorizedException);
  });

  it('pide verificar el correo antes de iniciar sesión', async () => {
    authPublico.signInWithPassword.mockResolvedValue({ data: {}, error: { code: 'email_not_confirmed' } });
    const error = await servicio.iniciarSesion({ correo: 'ana@correo.com', contrasena: 'x' }).catch((e) => e);
    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error.getResponse().codigo).toBe(CODIGO_CORREO_NO_VERIFICADO);
  });

  it('inicia sesión y devuelve el usuario sin datos internos', async () => {
    usuarios.push({ id: '1', authId: 'auth-1', correo: 'ana@correo.com', contrasena: 'hash', estado: 'ACTIVO', rol: 'CLIENTE' });
    authPublico.signInWithPassword.mockResolvedValue({ data: { session: sesion('auth-1') }, error: null });

    const resultado = await servicio.iniciarSesion({ correo: 'ana@correo.com', contrasena: 'correcta123' });

    expect(resultado.usuario).toEqual({ id: '1', correo: 'ana@correo.com', estado: 'ACTIVO', rol: 'CLIENTE' });
    expect(resultado.sesion.access_token).toBe('acceso');
  });

  it('cierra la sesión de Supabase si el usuario está inactivo', async () => {
    usuarios.push({ id: '1', authId: 'auth-1', correo: 'ana@correo.com', estado: 'INACTIVO', rol: 'CLIENTE' });
    authPublico.signInWithPassword.mockResolvedValue({ data: { session: sesion('auth-1') }, error: null });

    await expect(servicio.iniciarSesion({ correo: 'ana@correo.com', contrasena: 'correcta123' })).rejects.toThrow(
      UnauthorizedException,
    );
    expect(authAdmin.signOut).toHaveBeenCalledWith('acceso', 'local');
  });
});
