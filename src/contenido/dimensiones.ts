/**
 * Qué es cada dimensión del perfil, dicho para la persona (H17 del recorrido local).
 *
 * La descripción que manda el backend es la del instrumento, escrita para quien
 * lo evalúa: «Holland modela intereses en el vacío…». Acá va una en segunda
 * persona, y la del instrumento queda de respaldo para una dimensión que no esté
 * en la lista. **Son textos provisorios**: los revisa el asesor en psicología
 * vocacional.
 */
const PARA_LA_PERSONA: Record<string, string> = {
  R: "Hacer cosas con las manos, con herramientas o máquinas, y ver un resultado concreto.",
  I: "Entender cómo funcionan las cosas: investigar, analizar, resolver problemas pensando.",
  A: "Crear y expresarte: diseñar, dibujar, escribir, inventar algo propio.",
  S: "Trabajar con otras personas: ayudar, explicar, acompañar, enseñar.",
  E: "Llevar adelante proyectos: organizar, convencer, decidir y tomar la iniciativa.",
  C: "Ordenar y organizar: trabajar con datos, procedimientos y tareas claras.",
  "C-1":
    "Tu situación: si podrías mudarte, si necesitás trabajar mientras estudiás, qué te puede frenar.",
  "C-2": "Cuánto de lo que elegís sale de vos y cuánto de lo que esperan otros.",
  "C-3": "Cuánto sabés de las carreras que te interesan, más allá del nombre.",
  "C-4": "En qué te sentís capaz y en qué no tanto, aunque te guste.",
};

export function descripcionParaLaPersona(dimension: string, delInstrumento: string): string {
  return PARA_LA_PERSONA[dimension] ?? delInstrumento;
}

/**
 * Las seis áreas de intereses, con el nombre del instrumento. El informe es una
 * foto del cierre y sólo trae las áreas de las que la persona habló: las otras
 * se nombran desde acá para decir que no salieron, como en el perfil (VOCAIA-220).
 */
export const AREAS_DE_INTERES: readonly { codigo: string; nombre: string }[] = [
  { codigo: "R", nombre: "Realista" },
  { codigo: "I", nombre: "Investigador" },
  { codigo: "A", nombre: "Artístico" },
  { codigo: "S", nombre: "Social" },
  { codigo: "E", nombre: "Emprendedor" },
  { codigo: "C", nombre: "Convencional" },
];

/**
 * El rótulo de una cita dicha como rechazo, el mismo en el perfil y en el
 * informe. Sin él, «odio arreglar cosas» al lado de un área se leía como
 * afinidad. Sólo el rechazo explícito (−2): con −1 la cita es una aclaración
 * («no fue por arte») y rotularla como rechazo la falsea. Arreglo parcial: lo de
 * fondo es de la extracción.
 */
export function rotuloDeRechazo(valencia: number): string | null {
  return valencia === -2 ? "Lo dijiste como algo que no te gusta." : null;
}
