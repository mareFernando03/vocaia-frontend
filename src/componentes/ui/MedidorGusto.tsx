import { comoTeCae, nivelDeGusto } from "../../contenido/como-te-cae";
import { cn } from "../../lib/cn";

/**
 * Cuánto le gusta algo a la persona, en cinco escalones y con su frase.
 *
 * La barrita es para leerlo de un vistazo; lo que dice el escalón es la frase,
 * que está siempre al lado. Por eso la barrita va oculta para el lector de
 * pantalla: anunciaría cinco cosas para decir lo mismo que el texto.
 *
 * No hay número: «1,4» no le dice nada a quien lo lee, y daría una precisión
 * que el perfil no tiene.
 */
export function MedidorGusto({
  intensidad,
  className,
}: {
  intensidad: number;
  className?: string;
}) {
  const nivel = nivelDeGusto(intensidad);
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span aria-hidden="true" className="inline-flex gap-0.5">
        {[0, 1, 2, 3, 4].map((escalon) => (
          <span
            key={escalon}
            className={cn("h-2 w-4 rounded-full", escalon <= nivel ? "bg-primary" : "bg-border")}
          />
        ))}
      </span>
      <span className="text-sm font-medium">{comoTeCae(intensidad)}</span>
    </span>
  );
}
