/** Construye "?clave=valor&…" omitiendo valores vacíos. */
export function consulta(parametros: Record<string, string | undefined | null>): string {
  const busqueda = new URLSearchParams();
  Object.entries(parametros).forEach(([clave, valor]) => {
    if (valor) busqueda.set(clave, valor);
  });
  const texto = busqueda.toString();
  return texto ? `?${texto}` : '';
}
