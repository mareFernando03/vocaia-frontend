/**
 * Los textos de la lista blanca del piloto (protocolo del piloto §8).
 *
 * Mientras dura el piloto sólo entra quien se anotó en la página de inscripción,
 * que es la continuación de la encuesta de validación de agosto. El backend
 * rechaza al resto con un 403 que trae `X-Motivo: correo-no-habilitado`.
 */
export const PILOTO = {
  inscripcion: "https://voca-ia-survey.lovable.app",
  /** Lo que ve en el ingreso quien no está en la lista. */
  noHabilitado:
    "Esta prueba es por invitación. Si ya te anotaste, revisá que entraste con la misma cuenta de Google que usaste para anotarte; si te anotaste hoy, puede tardar hasta un día.",
  anotarse: "Si todavía no te anotaste, hacelo acá",
  /** El botón del informe que lleva a la encuesta final, en la misma página. */
  comoTeFue: "Contanos cómo te fue",
} as const;
