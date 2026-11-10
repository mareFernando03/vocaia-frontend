/**
 * Las dos formas en que la interfaz escribe una fecha.
 *
 * Estaban repetidas en cinco archivos, y una fecha que se escribe distinto en
 * el perfil y en el informe parece otra fecha.
 */

const LARGA = new Intl.DateTimeFormat("es-AR", { dateStyle: "long" });
const CORTA = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long" });

/** «8 de noviembre de 2026». */
export function fechaLarga(iso: string | Date): string {
  return LARGA.format(typeof iso === "string" ? new Date(iso) : iso);
}

/** «8 de noviembre»: para lo que pasó este año, donde el año sobra. */
export function fechaCorta(iso: string | Date): string {
  return CORTA.format(typeof iso === "string" ? new Date(iso) : iso);
}
