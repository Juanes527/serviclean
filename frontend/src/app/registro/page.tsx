'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { ArrowRight, Check, House, LockKeyhole, LucideIcon, Mail, Phone, Sparkles } from 'lucide-react';
import Alerta from '@/components/Alerta';
import AvisoVerificarCorreo from '@/components/AvisoVerificarCorreo';
import Boton from '@/components/Boton';
import CampoTexto from '@/components/CampoTexto';
import DisenoAutenticacion from '@/components/DisenoAutenticacion';
import { authServicio } from '@/servicios/auth.servicio';
import { rutaInicioPorRol, useAutenticacion } from '@/utilidades/contextoAutenticacion';
import { mensajeError } from '@/utilidades/errores';

const VALOR_INICIAL = {
  nombre: '',
  apellido: '',
  correo: '',
  telefono: '',
  contrasena: '',
  confirmarContrasena: '',
  rol: 'CLIENTE' as 'CLIENTE' | 'PERSONAL_ASEO',
};

type CampoRegistro = keyof typeof VALOR_INICIAL;

const ORDEN_CAMPOS: CampoRegistro[] = ['nombre', 'apellido', 'correo', 'telefono', 'contrasena', 'confirmarContrasena'];

const OPCIONES_ROL: { valor: 'CLIENTE' | 'PERSONAL_ASEO'; titulo: string; descripcion: string; icono: LucideIcon }[] = [
  { valor: 'CLIENTE', titulo: 'Quiero contratar', descripcion: 'Solicita servicios de limpieza', icono: House },
  { valor: 'PERSONAL_ASEO', titulo: 'Quiero trabajar', descripcion: 'Ofrece tus servicios de aseo', icono: Sparkles },
];

function validar(datos: typeof VALOR_INICIAL): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!datos.nombre.trim()) errores.nombre = 'El nombre es obligatorio.';
  if (!datos.apellido.trim()) errores.apellido = 'El apellido es obligatorio.';
  if (!/^\S+@\S+\.\S+$/.test(datos.correo)) errores.correo = 'El correo electrónico no es válido.';
  if (!/^[0-9+ ]{7,15}$/.test(datos.telefono)) errores.telefono = 'El teléfono no es válido.';
  if (datos.contrasena.length < 8) errores.contrasena = 'La contraseña debe tener al menos 8 caracteres.';
  if (datos.contrasena !== datos.confirmarContrasena) errores.confirmarContrasena = 'Las contraseñas no coinciden.';
  return errores;
}

export default function PaginaRegistro() {
  const router = useRouter();
  const { refrescarPerfil } = useAutenticacion();
  const [datos, setDatos] = useState(VALOR_INICIAL);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [cargando, setCargando] = useState(false);
  const [correoPorVerificar, setCorreoPorVerificar] = useState('');

  const actualizarCampo = (campo: CampoRegistro, valor: string) => {
    setDatos((anterior) => ({ ...anterior, [campo]: valor }));
    // Al corregir un campo se retira su error para dar feedback inmediato.
    if (errores[campo]) setErrores(({ [campo]: _omitido, ...resto }) => resto);
  };

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    setErrorGeneral('');
    const erroresValidacion = validar(datos);
    setErrores(erroresValidacion);
    const primerError = ORDEN_CAMPOS.find((campo) => erroresValidacion[campo]);
    if (primerError) {
      document.getElementById(`registro-${primerError}`)?.focus();
      return;
    }

    setCargando(true);
    try {
      const resultado = await authServicio.registrar(datos);
      if ('requiereVerificacion' in resultado) {
        setCorreoPorVerificar(resultado.correo);
        return;
      }
      await refrescarPerfil();
      router.push(rutaInicioPorRol(resultado.usuario.rol));
    } catch (excepcion) {
      setErrorGeneral(mensajeError(excepcion, 'No fue posible completar el registro.'));
      setCargando(false);
    }
  };

  if (correoPorVerificar) {
    return (
      <DisenoAutenticacion
        titulo="Revisa tu correo"
        descripcion="Tu cuenta fue creada. Solo falta confirmar tu correo electrónico."
        pie={
          <Link href="/iniciar-sesion" className="font-semibold text-marca-700 hover:text-marca-800 hover:underline">
            Ir a iniciar sesión
          </Link>
        }
      >
        <AvisoVerificarCorreo correo={correoPorVerificar} />
      </DisenoAutenticacion>
    );
  }

  return (
    <DisenoAutenticacion
      ancho="amplio"
      titulo="Crea tu cuenta"
      descripcion="Regístrate en menos de un minuto. Podrás actualizar tus datos cuando quieras."
      pie={
        <>
          ¿Ya tienes una cuenta?{' '}
          <Link href="/iniciar-sesion" className="font-semibold text-marca-700 hover:text-marca-800 hover:underline">
            Inicia sesión
          </Link>
        </>
      }
    >
      {errorGeneral && <Alerta tipo="error" mensaje={errorGeneral} className="mb-5" />}

      <form onSubmit={enviar} className="flex flex-col gap-5" noValidate>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">¿Cómo usarás ServiClean?</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {OPCIONES_ROL.map(({ valor, titulo, descripcion, icono: Icono }) => {
              const seleccionado = datos.rol === valor;
              return (
                <label
                  key={valor}
                  className={`relative flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-[border-color,background-color,box-shadow] duration-150 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-marca-100 ${
                    seleccionado ? 'border-marca-500 bg-marca-50/60 shadow-suave' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="rol"
                    value={valor}
                    checked={seleccionado}
                    onChange={() => actualizarCampo('rol', valor)}
                    className="sr-only"
                  />
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      seleccionado ? 'bg-marca-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Icono className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">{titulo}</span>
                    <span className="block text-[13px] text-slate-500">{descripcion}</span>
                  </span>
                  {seleccionado && (
                    <Check className="absolute right-3 top-3 h-4 w-4 text-marca-600" aria-hidden />
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <CampoTexto
            id="registro-nombre"
            etiqueta="Nombre"
            autoComplete="given-name"
            value={datos.nombre}
            onChange={(evento) => actualizarCampo('nombre', evento.target.value)}
            error={errores.nombre}
            required
          />
          <CampoTexto
            id="registro-apellido"
            etiqueta="Apellido"
            autoComplete="family-name"
            value={datos.apellido}
            onChange={(evento) => actualizarCampo('apellido', evento.target.value)}
            error={errores.apellido}
            required
          />
        </div>
        <CampoTexto
          id="registro-correo"
          etiqueta="Correo electrónico"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="tu@correo.com"
          icono={<Mail />}
          value={datos.correo}
          onChange={(evento) => actualizarCampo('correo', evento.target.value)}
          error={errores.correo}
          required
        />
        <CampoTexto
          id="registro-telefono"
          etiqueta="Teléfono"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="300 123 4567"
          icono={<Phone />}
          value={datos.telefono}
          onChange={(evento) => actualizarCampo('telefono', evento.target.value)}
          error={errores.telefono}
          required
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <CampoTexto
            id="registro-contrasena"
            etiqueta="Contraseña"
            type="password"
            autoComplete="new-password"
            icono={<LockKeyhole />}
            value={datos.contrasena}
            onChange={(evento) => actualizarCampo('contrasena', evento.target.value)}
            error={errores.contrasena}
            ayuda="Mínimo 8 caracteres."
            required
          />
          <CampoTexto
            id="registro-confirmarContrasena"
            etiqueta="Confirmar contraseña"
            type="password"
            autoComplete="new-password"
            icono={<LockKeyhole />}
            value={datos.confirmarContrasena}
            onChange={(evento) => actualizarCampo('confirmarContrasena', evento.target.value)}
            error={errores.confirmarContrasena}
            required
          />
        </div>
        <Boton type="submit" tamano="lg" cargando={cargando} className="mt-1 w-full" iconoDerecha={<ArrowRight className="h-4 w-4" />}>
          {cargando ? 'Creando tu cuenta…' : 'Crear cuenta'}
        </Boton>
      </form>
    </DisenoAutenticacion>
  );
}
