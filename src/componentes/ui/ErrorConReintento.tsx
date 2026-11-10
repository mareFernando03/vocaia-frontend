import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../../lib/cn";
import { Boton } from "./Boton";

/**
 * Lo que se muestra cuando algo no cargó: qué pasó y, si se puede, un botón
 * para volver a intentarlo.
 *
 * `role="alert"` para que se anuncie sin tener que ir a buscarlo. El color no
 * es lo único que dice que es un error: hay ícono y texto.
 */
export function ErrorConReintento({
  children,
  alReintentar,
  textoBoton = "Reintentar",
  className,
}: {
  children: ReactNode;
  alReintentar?: () => void;
  textoBoton?: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "text-destructive flex flex-wrap items-center gap-x-3 gap-y-2 text-sm",
        className,
      )}
    >
      <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">{children}</span>
      {alReintentar !== undefined && (
        <Boton variante="secundario" onClick={alReintentar}>
          {textoBoton}
        </Boton>
      )}
    </div>
  );
}
