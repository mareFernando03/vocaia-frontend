/**
 * El correo del proyecto, el mismo que la política de privacidad da para los
 * derechos sobre los datos (VOCAIA-206, `public/privacidad.html`).
 *
 * Es del equipo de VocaIA y no de la Facultad: a la Secretaría se le escribe por
 * lo académico; a esta dirección, por lo que VocaIA muestra mal.
 */
export const CONTACTO = {
  correo: "vocaia.utn@gmail.com",
} as const;

/** El correo ya escrito para avisar que un dato de una carrera está mal. */
export function correoDatoDesactualizado(carrera: string): string {
  const asunto = `Dato desactualizado: ${carrera}`;
  const cuerpo =
    `Hola, en VocaIA encontré un dato que me parece desactualizado o incorrecto sobre «${carrera}».\n\n` +
    "Qué dato es:\n\n" +
    "Qué debería decir (si lo sabés):\n";
  return `mailto:${CONTACTO.correo}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
}
