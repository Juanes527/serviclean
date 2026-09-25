import { Usuario } from '@/tipos';

export function formatearPrecio(valor: string | number): string {
  const numero = typeof valor === 'string' ? Number(valor) : valor;
  return numero.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

export function formatearFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatearFechaCorta(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Fecha legible y compacta: "vie, 12 sept 2026". */
export function formatearFechaMedia(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatearFechaHora(fecha: string): string {
  return new Date(fecha).toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Convierte "14:30" en "2:30 p. m.". */
export function formatearHora(hora: string): string {
  const [horas, minutos] = hora.split(':').map(Number);
  if (Number.isNaN(horas)) return hora;
  const fecha = new Date(Date.UTC(2000, 0, 1, horas, minutos || 0));
  return fecha.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
}

export function formatearDuracion(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

/** Partes de una fecha para bloques de calendario (día, mes, día de la semana). */
export function partesFecha(fecha: string) {
  const valor = new Date(fecha);
  return {
    dia: valor.toLocaleDateString('es-CO', { day: 'numeric', timeZone: 'UTC' }),
    mes: valor.toLocaleDateString('es-CO', { month: 'short', timeZone: 'UTC' }).replace('.', ''),
    semana: valor.toLocaleDateString('es-CO', { weekday: 'short', timeZone: 'UTC' }).replace('.', ''),
  };
}

/** Fecha local en formato AAAA-MM-DD (evita el desfase de toISOString en horario de Colombia). */
export function fechaISOLocal(fecha: Date = new Date()): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/** Clave AAAA-MM-DD de una fecha proveniente de la API (almacenada en UTC). */
export function claveFecha(fecha: string): string {
  return fecha.slice(0, 10);
}

/** "Hoy", "Mañana" o la fecha legible, para agrupar la agenda. */
export function etiquetaDia(fecha: string): string {
  const clave = claveFecha(fecha);
  const hoy = new Date();
  const manana = new Date();
  manana.setDate(hoy.getDate() + 1);
  if (clave === fechaISOLocal(hoy)) return 'Hoy';
  if (clave === fechaISOLocal(manana)) return 'Mañana';
  const texto = formatearFecha(fecha);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Tiempo relativo breve: "hace 5 min", "hace 2 días". */
export function formatearRelativo(fecha: string): string {
  const diferencia = Date.now() - new Date(fecha).getTime();
  const minutos = Math.round(diferencia / 60000);
  if (minutos < 1) return 'Justo ahora';
  if (minutos < 60) return `Hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `Hace ${horas} h`;
  const dias = Math.round(horas / 24);
  if (dias < 7) return dias === 1 ? 'Ayer' : `Hace ${dias} días`;
  return new Date(fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

/** Marca de tiempo comparable para ordenar solicitudes por fecha y hora del servicio. */
export function marcaServicio(fecha: string, hora: string): number {
  return new Date(`${claveFecha(fecha)}T${hora.length === 5 ? hora : '00:00'}:00`).getTime();
}

export function nombreCompleto(usuario?: Pick<Usuario, 'nombre' | 'apellido'> | null): string {
  if (!usuario) return '';
  return `${usuario.nombre} ${usuario.apellido}`.trim();
}

export function iniciales(usuario?: Pick<Usuario, 'nombre' | 'apellido'> | null): string {
  if (!usuario) return '';
  return `${usuario.nombre?.charAt(0) ?? ''}${usuario.apellido?.charAt(0) ?? ''}`.toUpperCase();
}

/** Normaliza texto para búsquedas sin tildes ni mayúsculas. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function coincideBusqueda(busqueda: string, ...campos: (string | undefined | null)[]): boolean {
  const termino = normalizar(busqueda.trim());
  if (!termino) return true;
  return campos.some((campo) => campo && normalizar(campo).includes(termino));
}

/** Monto con signo explícito: "+$40.000" / "−$10.000". */
export function formatearMontoConSigno(valor: string | number): string {
  const numero = typeof valor === 'string' ? Number(valor) : valor;
  if (numero === 0) return formatearPrecio(0);
  return `${numero > 0 ? '+' : '−'}${formatearPrecio(Math.abs(numero))}`;
}

/** Referencia corta de un servicio: "#3F2A91" (la misma que usa el backend). */
export function referenciaServicio(solicitudId: string): string {
  return `#${solicitudId.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

export function referenciaLiquidacion(numero: number): string {
  return `L-${String(numero).padStart(4, '0')}`;
}

/** Periodo legible: "12 sept 2026 – 25 sept 2026". */
export function formatearPeriodo(inicio: string, fin: string): string {
  const opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  return `${new Date(inicio).toLocaleDateString('es-CO', opciones)} – ${new Date(fin).toLocaleDateString('es-CO', opciones)}`;
}
