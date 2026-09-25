'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CalendarDays, LockKeyhole, Mail, Phone, ShieldCheck } from 'lucide-react';
import Alerta from '@/components/Alerta';
import Avatar from '@/components/Avatar';
import { useAvisos } from '@/components/Avisos';
import Boton from '@/components/Boton';
import CampoTexto from '@/components/CampoTexto';
import EncabezadoPagina from '@/components/EncabezadoPagina';
import { Insignia } from '@/components/EstadoBadge';
import Tarjeta, { EncabezadoTarjeta } from '@/components/Tarjeta';
import { usuariosServicio } from '@/servicios/usuarios.servicio';
import { useAutenticacion } from '@/utilidades/contextoAutenticacion';
import { mensajeError } from '@/utilidades/errores';
import { TEXTO_ROL } from '@/utilidades/estados';
import { formatearFechaCorta, nombreCompleto } from '@/utilidades/formato';

export default function FormularioPerfil() {
  const { usuario, refrescarPerfil } = useAutenticacion();
  const { avisar } = useAvisos();
  const [datosPerfil, setDatosPerfil] = useState({ nombre: '', apellido: '', correo: '', telefono: '' });
  const [errorPerfil, setErrorPerfil] = useState('');
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);

  const [datosContrasena, setDatosContrasena] = useState({
    contrasenaActual: '',
    nuevaContrasena: '',
    confirmarContrasena: '',
  });
  const [errorContrasena, setErrorContrasena] = useState('');
  const [guardandoContrasena, setGuardandoContrasena] = useState(false);

  useEffect(() => {
    if (usuario) {
      setDatosPerfil({
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        correo: usuario.correo,
        telefono: usuario.telefono,
      });
    }
  }, [usuario]);

  const hayCambios =
    !!usuario &&
    (datosPerfil.nombre !== usuario.nombre ||
      datosPerfil.apellido !== usuario.apellido ||
      datosPerfil.correo !== usuario.correo ||
      datosPerfil.telefono !== usuario.telefono);

  const guardarPerfil = async (evento: FormEvent) => {
    evento.preventDefault();
    setErrorPerfil('');
    setGuardandoPerfil(true);
    try {
      await usuariosServicio.actualizarPerfil(datosPerfil);
      await refrescarPerfil();
      avisar({ tipo: 'exito', titulo: 'Perfil actualizado', descripcion: 'Tus datos se guardaron correctamente.' });
    } catch (excepcion) {
      setErrorPerfil(mensajeError(excepcion, 'No fue posible actualizar el perfil.'));
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const cambiarContrasena = async (evento: FormEvent) => {
    evento.preventDefault();
    setErrorContrasena('');
    if (datosContrasena.nuevaContrasena !== datosContrasena.confirmarContrasena) {
      setErrorContrasena('Las contraseñas nuevas no coinciden.');
      return;
    }
    setGuardandoContrasena(true);
    try {
      const resultado = await usuariosServicio.cambiarContrasena(datosContrasena);
      avisar({ tipo: 'exito', titulo: 'Contraseña actualizada', descripcion: resultado.mensaje });
      setDatosContrasena({ contrasenaActual: '', nuevaContrasena: '', confirmarContrasena: '' });
    } catch (excepcion) {
      setErrorContrasena(mensajeError(excepcion, 'No fue posible cambiar la contraseña.'));
    } finally {
      setGuardandoContrasena(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Mi perfil" descripcion="Administra tu información personal y la seguridad de tu cuenta." />

      <Tarjeta relleno="ninguno" className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-marca-600 via-marca-500 to-fresco-500 sm:h-24" aria-hidden />
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:pb-6">
          <div className="-mt-8 flex items-end gap-4">
            <span className="rounded-full ring-4 ring-white">
              <Avatar usuario={usuario} tamano="lg" />
            </span>
            <div className="min-w-0 pb-1">
              <p className="truncate font-display text-lg font-bold text-slate-900">{nombreCompleto(usuario)}</p>
              <p className="truncate text-sm text-slate-500">{usuario?.correo}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {usuario && <Insignia tono="marca">{TEXTO_ROL[usuario.rol]}</Insignia>}
            {usuario && (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                Miembro desde {formatearFechaCorta(usuario.fechaCreacion)}
              </span>
            )}
          </div>
        </div>
      </Tarjeta>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Tarjeta>
          <EncabezadoTarjeta titulo="Información personal" descripcion="Estos datos se usan para coordinar tus servicios." className="mb-5" />
          {errorPerfil && <Alerta tipo="error" mensaje={errorPerfil} className="mb-5" />}
          <form onSubmit={guardarPerfil} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <CampoTexto
                etiqueta="Nombre"
                autoComplete="given-name"
                value={datosPerfil.nombre}
                onChange={(evento) => setDatosPerfil({ ...datosPerfil, nombre: evento.target.value })}
                required
              />
              <CampoTexto
                etiqueta="Apellido"
                autoComplete="family-name"
                value={datosPerfil.apellido}
                onChange={(evento) => setDatosPerfil({ ...datosPerfil, apellido: evento.target.value })}
                required
              />
            </div>
            <CampoTexto
              etiqueta="Correo electrónico"
              type="email"
              autoComplete="email"
              icono={<Mail />}
              value={datosPerfil.correo}
              onChange={(evento) => setDatosPerfil({ ...datosPerfil, correo: evento.target.value })}
              required
            />
            <CampoTexto
              etiqueta="Teléfono"
              type="tel"
              autoComplete="tel"
              icono={<Phone />}
              value={datosPerfil.telefono}
              onChange={(evento) => setDatosPerfil({ ...datosPerfil, telefono: evento.target.value })}
              required
            />
            <div className="flex justify-end border-t border-slate-100 pt-5">
              <Boton type="submit" cargando={guardandoPerfil} disabled={!hayCambios} className="w-full sm:w-auto">
                Guardar cambios
              </Boton>
            </div>
          </form>
        </Tarjeta>

        <Tarjeta>
          <EncabezadoTarjeta titulo="Seguridad" descripcion="Cambia tu contraseña periódicamente para proteger tu cuenta." className="mb-5" />
          {errorContrasena && <Alerta tipo="error" mensaje={errorContrasena} className="mb-5" />}
          <form onSubmit={cambiarContrasena} className="flex flex-col gap-5">
            <CampoTexto
              etiqueta="Contraseña actual"
              type="password"
              autoComplete="current-password"
              icono={<LockKeyhole />}
              value={datosContrasena.contrasenaActual}
              onChange={(evento) => setDatosContrasena({ ...datosContrasena, contrasenaActual: evento.target.value })}
              required
            />
            <CampoTexto
              etiqueta="Nueva contraseña"
              type="password"
              autoComplete="new-password"
              icono={<LockKeyhole />}
              value={datosContrasena.nuevaContrasena}
              onChange={(evento) => setDatosContrasena({ ...datosContrasena, nuevaContrasena: evento.target.value })}
              ayuda="Mínimo 8 caracteres."
              required
            />
            <CampoTexto
              etiqueta="Confirmar nueva contraseña"
              type="password"
              autoComplete="new-password"
              icono={<LockKeyhole />}
              value={datosContrasena.confirmarContrasena}
              onChange={(evento) => setDatosContrasena({ ...datosContrasena, confirmarContrasena: evento.target.value })}
              required
            />
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="h-4 w-4 text-fresco-600" aria-hidden />
                Tu contraseña se guarda protegida, nunca en texto plano.
              </p>
              <Boton type="submit" variante="contorno" cargando={guardandoContrasena} className="w-full sm:w-auto">
                Actualizar contraseña
              </Boton>
            </div>
          </form>
        </Tarjeta>
      </div>
    </div>
  );
}
