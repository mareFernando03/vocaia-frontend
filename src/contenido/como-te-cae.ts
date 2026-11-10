/**
 * Cómo se lee la escala de -2 a 2 sin nombrarla.
 *
 * La usan el perfil y el informe, y tienen que decir lo mismo: la persona que
 * lee «te interesa» en uno y «te entusiasma» en el otro para la misma
 * intensidad deja de creerle a los dos.
 *
 * El escalón y la frase salen de los mismos umbrales, en este archivo y en
 * ningún otro: si la barrita y el texto se separaran, la pantalla diría dos
 * cosas a la vez sobre la misma persona.
 */

/** De 0 («Te desagrada») a 4 («Te entusiasma»). */
export function nivelDeGusto(intensidad: number): 0 | 1 | 2 | 3 | 4 {
  if (intensidad >= 1) return 4;
  if (intensidad >= 0.25) return 3;
  if (intensidad > -0.25) return 2;
  if (intensidad > -1) return 1;
  return 0;
}

const FRASES = [
  "Te desagrada",
  "No te termina de cerrar",
  "Te resulta indistinto",
  "Te interesa",
  "Te entusiasma",
] as const;

export function comoTeCae(intensidad: number): string {
  return FRASES[nivelDeGusto(intensidad)];
}
