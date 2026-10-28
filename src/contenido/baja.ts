/**
 * Los textos de la baja de la cuenta (HU-04, S6-03).
 *
 * Dicen lo mismo que ADR-014: qué se borra, que no se deshace, que volver a
 * entrar es empezar de cero y cuánto tarda en irse de la copia de seguridad.
 * No prometen más que eso: lo que la baja no alcanza lo dice el aviso de
 * tratamiento, que es donde la persona lo lee antes de empezar.
 */
export const BAJA = {
  titulo: "Borrar tu cuenta",
  explicacion:
    "Se borran tus conversaciones, tu perfil, lo que marcaste que no te representa, tu cuenta y lo que autorizaste. No se puede deshacer: si volvés a entrar, empezás de cero.",
  respaldo:
    "La copia de seguridad se renueva cada semana, así que ahí puede quedar hasta 7 días más.",
  boton: "Borrar mi cuenta",
  pregunta: "¿Seguro? Esto borra todo lo que contaste y no se puede deshacer.",
  confirmar: "Sí, borrar todo",
  cancelar: "Cancelar",
  borrando: "Borrando…",
} as const;
