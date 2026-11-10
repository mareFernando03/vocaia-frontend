import { Tooltip } from "radix-ui";
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

import { cn } from "../../lib/cn";

/**
 * Un botón que es sólo un ícono.
 *
 * El nombre accesible es obligatorio y es el texto completo de lo que hace: un
 * ícono solo no le dice nada a un lector de pantalla. El mismo texto aparece
 * como etiqueta flotante al pasar el mouse o al llegar con el teclado, para
 * quien ve el ícono y no adivina qué es.
 *
 * El proveedor va acá adentro y no en la raíz de la aplicación: cada pantalla
 * se puede dibujar sola, en las pruebas o donde sea, sin depender de que
 * alguien más lo haya puesto arriba.
 */

interface Propiedades extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  etiqueta: string;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

export function BotonIcono({ etiqueta, children, className, type, ...resto }: Propiedades) {
  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type={type ?? "button"}
            aria-label={etiqueta}
            className={cn(
              "text-muted-foreground hover:text-foreground hover:bg-primary-soft inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-5",
              className,
            )}
            {...resto}
          >
            {children}
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            sideOffset={4}
            className="bg-foreground text-background animate-aparecer z-50 rounded-lg px-2.5 py-1.5 text-xs font-medium"
          >
            {etiqueta}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
