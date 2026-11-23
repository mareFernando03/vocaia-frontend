/**
 * Fuentes y citas sin repetir (recorrido del 22/11).
 *
 * «¿De dónde salió esto?» listó la Ordenanza 1877 tres veces —páginas 54, 40 y sin
 * página— porque cada materia es un fragmento con su página, y se comparaba el texto
 * entero. Y en lo que contó la persona, «porque dicen que tiene salida» aparecía aparte
 * de la frase que la contiene.
 */

/** El documento de una fuente, sin la página: «Ordenanza…, pág. 54 — url#page=54». */
export function documentoDe(fuente: string): string {
  return fuente.replace(/, pág\. \d+/, "").replace(/#page=\d+/, "");
}

/** Una por documento, la primera que aparece. */
export function unaPorDocumento<T extends { fuente: string }>(fuentes: T[]): T[] {
  const vistos = new Set<string>();
  return fuentes.filter((f) => {
    const clave = documentoDe(f.fuente);
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
}

/** Las fuentes que la respuesta cita con `[n]`: el número es su lugar en la lista, desde 1. */
export function citadas<T>(fuentes: T[], respuesta: string): T[] {
  const numeros = new Set([...respuesta.matchAll(/\[(\d{1,2})\]/g)].map((m) => Number(m[1])));
  return fuentes.filter((_, indice) => numeros.has(indice + 1));
}

/** Sin las frases que ya están dentro de otra más larga del mismo mensaje. */
export function sinContenidas<T extends { fragmento: string; sesion_id: string; turno: number }>(
  citas: T[],
): T[] {
  return citas.filter(
    (cita) =>
      !citas.some(
        (otra) =>
          otra !== cita &&
          otra.sesion_id === cita.sesion_id &&
          otra.turno === cita.turno &&
          otra.fragmento.length > cita.fragmento.length &&
          otra.fragmento.includes(cita.fragmento),
      ),
  );
}
