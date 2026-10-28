/**
 * Los textos de la baja de la cuenta (HU-04, S6-03).
 *
 * Dicen lo mismo que ADR-014: qué se borra, que no se deshace, que volver a
 * entrar es empezar de cero y cuánto tarda en irse de la copia de seguridad.
 * No prometen más que eso —ni «todo», ni nada fuera de VocaIA—: lo que la baja
 * no alcanza lo dice el aviso de tratamiento (aviso-v3, S6-12), que es donde la
 * persona lo lee antes de empezar.
 */
export const BAJA = {
  titulo: "Borrar tu cuenta de VocaIA",
  explicacion:
    "Se borran tus conversaciones, tu perfil, lo que marcaste que no te representa, tu cuenta y lo que autorizaste. No se puede deshacer: si volvés a entrar, empezás de cero.",
  respaldo:
    "La copia de seguridad se renueva cada semana, así que ahí puede quedar hasta 7 días más.",
  boton: "Borrar mi cuenta",
  pregunta: "¿Lo confirmás? Se borra lo que contaste en VocaIA y no se puede deshacer.",
  confirmar: "Sí, borrar mi cuenta",
  cancelar: "Cancelar",
  borrando: "Borrando…",
  /** Lo que ve en el ingreso cuando terminó. */
  hecha: "Borramos tu cuenta de VocaIA. Si volvés a entrar, empezás de cero.",
  /**
   * Lo que ve en el ingreso cuando no terminó. Es el mismo texto que el 500 del
   * backend: la credencial ya se cortó, así que hay que volver a entrar.
   */
  noTermino:
    "La baja no terminó. Volvé a entrar y pedila de nuevo desde tu perfil: lo que ya se borró no vuelve.",
} as const;
