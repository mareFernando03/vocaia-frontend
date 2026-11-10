import { cn } from "../../lib/cn";

/**
 * Una espera que se dice con palabras.
 *
 * El sistema de diseño pide texto y no un ícono girando: un spinner mudo no le
 * dice nada a un lector de pantalla. Los tres puntos acompañan al texto y
 * respetan a quien pidió menos movimiento: con eso activado quedan quietos.
 */
export function Cargando({ texto, className }: { texto: string; className?: string }) {
  return (
    <span className={cn("text-muted-foreground inline-flex items-center gap-2 text-sm", className)}>
      <span aria-hidden="true" className="inline-flex gap-1">
        <span className="animate-puntos size-1.5 rounded-full bg-current" />
        <span className="animate-puntos size-1.5 rounded-full bg-current [animation-delay:150ms]" />
        <span className="animate-puntos size-1.5 rounded-full bg-current [animation-delay:300ms]" />
      </span>
      {texto}
    </span>
  );
}
