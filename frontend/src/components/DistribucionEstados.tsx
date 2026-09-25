import { EstadoSolicitud } from '@/tipos';
import { CLASES_TONO, ESTADOS_SOLICITUD, ORDEN_ESTADOS_SOLICITUD } from '@/utilidades/estados';

interface PropiedadesDistribucion {
  datos: { estado: string; total: number }[];
}

/** Barra apilada + leyenda con cifras: cómo se reparten las solicitudes por estado. */
export default function DistribucionEstados({ datos }: PropiedadesDistribucion) {
  const mapa = new Map(datos.map((item) => [item.estado, item.total]));
  const total = datos.reduce((suma, item) => suma + item.total, 0);
  const filas = ORDEN_ESTADOS_SOLICITUD.map((estado: EstadoSolicitud) => ({
    estado,
    total: mapa.get(estado) ?? 0,
    porcentaje: total > 0 ? Math.round(((mapa.get(estado) ?? 0) / total) * 100) : 0,
  }));

  if (total === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">Aún no hay solicitudes registradas.</p>;
  }

  const resumen = filas.map((fila) => `${ESTADOS_SOLICITUD[fila.estado].texto}: ${fila.total}`).join(', ');

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`Distribución de ${total} solicitudes. ${resumen}.`}>
        {filas
          .filter((fila) => fila.total > 0)
          .map((fila) => (
            <span
              key={fila.estado}
              className={`h-full ${CLASES_TONO[ESTADOS_SOLICITUD[fila.estado].tono].barra} border-r-2 border-white last:border-r-0`}
              style={{ width: `${(fila.total / total) * 100}%` }}
              title={`${ESTADOS_SOLICITUD[fila.estado].texto}: ${fila.total}`}
            />
          ))}
      </div>
      <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
        {filas.map((fila) => (
          <li key={fila.estado} className="flex items-center gap-3 rounded-lg py-1.5 text-sm">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${CLASES_TONO[ESTADOS_SOLICITUD[fila.estado].tono].punto}`} aria-hidden />
            <span className="flex-1 text-slate-600">{ESTADOS_SOLICITUD[fila.estado].texto}</span>
            <span className="font-semibold text-slate-900 cifras">{fila.total}</span>
            <span className="w-10 text-right text-xs text-slate-400 cifras">{fila.porcentaje}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
