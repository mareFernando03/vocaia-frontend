import { cn } from "../../lib/cn";

/**
 * Las clases de `Boton`, aparte del componente para poder usarlas en algo que
 * no es un `<button>` ni pasa por `comoHijo`.
 *
 * Cuál usar (jerarquía de Carbon y Material, que coinciden en lo esencial):
 *
 * - `primario`: la acción principal de la pantalla. **Una por pantalla**: dos
 *   botones llenos compiten y la persona ya no sabe cuál es el camino.
 * - `secundario`: con borde. Una alternativa al primario («Cancelar»), o una
 *   acción que importa pero no es la principal («Descargar mis datos»).
 * - `fantasma`: sin borde ni fondo. Lo de poco peso: acciones de una barra, o
 *   lo que acompaña sin pedir atención.
 * - `enlace`: lleva a otro lugar dentro de una línea de texto.
 * - `peligro`: lleno y rojo. Sólo para **confirmar** algo que no se deshace
 *   («Sí, borrar mi cuenta»), y siempre después de un paso que pregunta.
 * - `peligro-fantasma`: texto rojo sin fondo. Lo que corta algo pero todavía no
 *   destruye nada: abrir la baja de la cuenta, cerrar la sesión. Avisa con el
 *   color sin gritar, y no se confunde con la acción principal.
 *
 * Las decisiones de consentimiento (autorizar el aviso a la Facultad) llevan el
 * peso que les dio el equipo, no el que sugiera esta lista: inclinar una de las
 * dos opciones con el color es empujar la respuesta.
 */

export type Variante =
  "primario" | "secundario" | "fantasma" | "enlace" | "peligro" | "peligro-fantasma";

const VARIANTES: Record<Variante, string> = {
  primario: "bg-primary text-primary-foreground hover:bg-primary-light shadow-tarjeta font-medium",
  secundario: "border-input bg-surface text-foreground hover:bg-primary-soft border font-medium",
  fantasma: "text-foreground hover:bg-primary-soft",
  enlace:
    "text-primary px-0 underline underline-offset-4 decoration-1 hover:decoration-2 rounded-sm",
  peligro: "bg-destructive text-destructive-foreground font-medium hover:opacity-90",
  "peligro-fantasma": "text-destructive hover:bg-destructive-soft font-medium",
};

export const BASE_BOTON =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm transition-colors select-none disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

export function clasesBoton(variante: Variante = "secundario", className?: string): string {
  return cn(BASE_BOTON, VARIANTES[variante], className);
}
