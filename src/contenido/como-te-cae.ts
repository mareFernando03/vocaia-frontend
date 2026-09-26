/**
 * Cómo se lee la escala de -2 a 2 sin nombrarla.
 *
 * La usan el perfil y el informe, y tienen que decir lo mismo: la persona que
 * lee «te interesa» en uno y «te entusiasma» en el otro para la misma
 * intensidad deja de creerle a los dos.
 */
export function comoTeCae(intensidad: number): string {
  if (intensidad >= 1) return "Te entusiasma";
  if (intensidad >= 0.25) return "Te interesa";
  if (intensidad > -0.25) return "Te resulta indistinto";
  if (intensidad > -1) return "No te termina de cerrar";
  return "Te desagrada";
}
