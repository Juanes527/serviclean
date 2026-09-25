'use client';

import { useMemo, useState } from 'react';
import { Power, PowerOff, SearchX, Users } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useAvisos } from '@/components/Avisos';
import Boton from '@/components/Boton';
import DialogoConfirmacion from '@/components/DialogoConfirmacion';
import EncabezadoPagina from '@/components/EncabezadoPagina';
import { EsqueletoLista } from '@/components/Esqueleto';
import EstadoBadge, { Insignia } from '@/components/EstadoBadge';
import EstadoVacio, { EstadoError } from '@/components/EstadoVacio';
import { CampoBusqueda, FiltroSegmentado, OpcionFiltro } from '@/components/Filtros';
import Tabla, { CeldaPrincipal, ColumnaTabla } from '@/components/Tabla';
import { reportesServicio } from '@/servicios/reportes.servicio';
import { usuariosServicio } from '@/servicios/usuarios.servicio';
import { RolUsuario, Usuario } from '@/tipos';
import { mensajeError } from '@/utilidades/errores';
import { TEXTO_ROL, Tono } from '@/utilidades/estados';
import { coincideBusqueda, formatearFechaCorta, nombreCompleto } from '@/utilidades/formato';
import { useCarga } from '@/utilidades/useCarga';

type Filtro = 'TODOS' | RolUsuario;

const TONO_ROL: Record<RolUsuario, Tono> = { CLIENTE: 'info', PERSONAL_ASEO: 'fresco', ADMINISTRADOR: 'marca' };

export default function UsuariosAdmin() {
  const { avisar } = useAvisos();
  const [filtroRol, setFiltroRol] = useState<Filtro>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [aCambiar, setACambiar] = useState<Usuario | null>(null);
  const [procesando, setProcesando] = useState(false);
  const { datos: resumen } = useCarga(() => reportesServicio.resumen().catch(() => null));
  const { datos, cargando, error, recargar } = useCarga(
    () => usuariosServicio.listar(filtroRol === 'TODOS' ? undefined : filtroRol),
    [filtroRol],
  );

  const opciones: OpcionFiltro<Filtro>[] = useMemo(
    () => [
      { valor: 'TODOS', texto: 'Todos', total: resumen?.totalUsuarios },
      { valor: 'CLIENTE', texto: 'Clientes', total: resumen?.totalClientes },
      { valor: 'PERSONAL_ASEO', texto: 'Personal de aseo', total: resumen?.totalPersonal },
      {
        valor: 'ADMINISTRADOR',
        texto: 'Administradores',
        total: resumen ? resumen.totalUsuarios - resumen.totalClientes - resumen.totalPersonal : undefined,
      },
    ],
    [resumen],
  );

  const filtrados = useMemo(
    () => (datos ?? []).filter((usuario) => coincideBusqueda(busqueda, nombreCompleto(usuario), usuario.correo, usuario.telefono)),
    [datos, busqueda],
  );

  const cambiarEstado = async () => {
    if (!aCambiar) return;
    const nuevoEstado = aCambiar.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    setProcesando(true);
    try {
      await usuariosServicio.actualizarEstado(aCambiar.id, nuevoEstado);
      avisar({
        tipo: 'exito',
        titulo: nuevoEstado === 'ACTIVO' ? 'Usuario activado' : 'Usuario desactivado',
        descripcion: nombreCompleto(aCambiar),
      });
      setACambiar(null);
      await recargar(true);
    } catch (excepcion) {
      avisar({ tipo: 'error', titulo: 'No se pudo actualizar el usuario', descripcion: mensajeError(excepcion, 'Inténtalo de nuevo.') });
    } finally {
      setProcesando(false);
    }
  };

  const columnas: ColumnaTabla<Usuario>[] = [
    {
      clave: 'usuario',
      titulo: 'Usuario',
      ocultarEnMovil: true,
      render: (usuario) => <CeldaPrincipal icono={<Avatar usuario={usuario} />} titulo={nombreCompleto(usuario)} subtitulo={usuario.correo} />,
    },
    { clave: 'telefono', titulo: 'Teléfono', render: (usuario) => <span className="cifras">{usuario.telefono}</span> },
    {
      clave: 'rol',
      titulo: 'Rol',
      render: (usuario) => (
        <Insignia tono={TONO_ROL[usuario.rol]} conPunto={false}>
          {TEXTO_ROL[usuario.rol]}
        </Insignia>
      ),
    },
    { clave: 'registro', titulo: 'Registro', render: (usuario) => formatearFechaCorta(usuario.fechaCreacion) },
    { clave: 'estado', titulo: 'Estado', ocultarEnMovil: true, render: (usuario) => <EstadoBadge tipo="usuario" estado={usuario.estado} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Usuarios" descripcion="Gestiona las cuentas de clientes, personal de aseo y administradores." />

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <FiltroSegmentado etiqueta="Filtrar por rol" opciones={opciones} valor={filtroRol} onCambiar={setFiltroRol} />
        <CampoBusqueda valor={busqueda} onCambiar={setBusqueda} placeholder="Buscar por nombre, correo o teléfono" />
      </div>

      {cargando ? (
        <EsqueletoLista filas={6} />
      ) : error ? (
        <EstadoError mensaje={error} onReintentar={() => recargar()} />
      ) : (datos ?? []).length === 0 ? (
        <EstadoVacio icono={Users} titulo="No hay usuarios para mostrar" descripcion="No se encontraron usuarios con este rol." />
      ) : filtrados.length === 0 ? (
        <EstadoVacio icono={SearchX} titulo="Sin resultados" descripcion={`Ningún usuario coincide con “${busqueda}”.`} />
      ) : (
        <Tabla
          etiqueta="Usuarios registrados"
          columnas={columnas}
          filas={filtrados}
          claveFila={(usuario) => usuario.id}
          resumenMovil={(usuario) => <CeldaPrincipal icono={<Avatar usuario={usuario} />} titulo={nombreCompleto(usuario)} subtitulo={usuario.correo} />}
          destacadoMovil={(usuario) => <EstadoBadge tipo="usuario" estado={usuario.estado} />}
          acciones={(usuario) =>
            usuario.rol !== 'ADMINISTRADOR' ? (
              usuario.estado === 'ACTIVO' ? (
                <Boton
                  variante="fantasmaPeligro"
                  tamano="sm"
                  icono={<PowerOff className="h-4 w-4" />}
                                    onClick={() => setACambiar(usuario)}
                >
                  Desactivar
                </Boton>
              ) : (
                <Boton variante="secundario" tamano="sm" icono={<Power className="h-4 w-4" />} onClick={() => setACambiar(usuario)}>
                  Activar
                </Boton>
              )
            ) : null
          }
        />
      )}

      <DialogoConfirmacion
        abierto={!!aCambiar}
        peligroso={aCambiar?.estado === 'ACTIVO'}
        titulo={aCambiar?.estado === 'ACTIVO' ? '¿Desactivar este usuario?' : '¿Activar este usuario?'}
        descripcion={
          aCambiar &&
          (aCambiar.estado === 'ACTIVO'
            ? `${nombreCompleto(aCambiar)} no podrá iniciar sesión hasta que vuelvas a activar su cuenta.`
            : `${nombreCompleto(aCambiar)} podrá volver a iniciar sesión y usar la plataforma.`)
        }
        textoConfirmar={aCambiar?.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'}
        procesando={procesando}
        onConfirmar={cambiarEstado}
        onCancelar={() => setACambiar(null)}
      />
    </div>
  );
}
