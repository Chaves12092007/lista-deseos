/** Formato de lo que se muestra de un deseo (spec, reglas 14 y 15). */

const COP_FORMAT = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

/** Precio en pesos colombianos, sin decimales. */
export function formatCop(value: number): string {
  return COP_FORMAT.format(value);
}

/** Texto del enlace a la tienda: el host de la URL; si no se puede leer, la URL tal cual. */
export function storeHost(url: string): string {
  if (!URL.canParse(url)) {
    return url;
  }
  return new URL(url).host;
}
