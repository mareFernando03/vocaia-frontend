/**
 * Lo que la pantalla dice sobre seguir una conversación o empezar otra
 * (VOCAIA-222, de la devolución de la asesora del 17/11).
 *
 * Cerrar la pestaña arranca una conversación nueva a propósito, por las
 * computadoras compartidas (HU-07), y la anterior se retoma desde Historial.
 * Nada de eso estaba dicho: quien volvía encontraba una charla vacía.
 *
 * No promete memoria. Una conversación nueva no sabe lo que se habló en otra
 * —la guía de retoma del backend entra recién después de 60 días—; lo que sí
 * se junta de todas es el perfil.
 */
export const RETOMAR = {
  explicacionHistorial:
    "Tocá una conversación para seguirla donde quedó. Si empezás una nueva, la charla arranca de cero, pero lo que ya contaste sigue en tu perfil.",
  seguir: "Seguir",
  retomada: "Seguís una conversación que ya habías empezado.",
  hayAnteriores: "¿Querías seguir una conversación anterior? Está en tu historial.",
  irAlHistorial: "Ir al historial",
} as const;
