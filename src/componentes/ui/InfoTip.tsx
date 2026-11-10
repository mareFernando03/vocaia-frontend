import { Info, X } from "lucide-react";
import { Popover } from "radix-ui";
import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

/**
 * La única forma de agregar una explicación en la interfaz.
 *
 * La pantalla no se llena de aclaraciones: dice lo que tiene que decir, y lo
 * que necesita un porqué lleva este ícono al lado. Es un *toggletip* y no un
 * *tooltip*: se abre al tocarlo o con Enter, y queda abierto hasta que se
 * cierra. Un tooltip que aparece al pasar el mouse no existe en un teléfono, y
 * desaparece justo mientras se lo está leyendo.
 *
 * **No es lugar para una salvedad.** Si un dato es provisional o el perfil no
 * alcanza para recomendar, eso se lee sin abrir nada (revisor de lenguaje,
 * punto 3). Lo que va acá es el porqué de esa salvedad.
 *
 * En papel no hay qué tocar: al imprimir, el texto se escribe debajo, entre
 * paréntesis. Si no, el informe en PDF perdería las explicaciones.
 */

interface Propiedades {
  /** Sobre qué es la explicación: completa «Más sobre…» en el nombre del botón. */
  tema: string;
  children: ReactNode;
  className?: string;
}

export function InfoTip({ tema, children, className }: Propiedades) {
  return (
    <>
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            type="button"
            aria-label={`Más sobre ${tema}`}
            className={cn(
              // El ícono mide 16 px pero el área táctil es de 44: el margen
              // negativo deja que se siente en la línea de texto sin agrandarla.
              "text-muted-foreground hover:text-primary data-[state=open]:text-primary -my-3 inline-flex size-11 shrink-0 items-center justify-center rounded-full align-middle transition-colors print:hidden",
              className,
            )}
          >
            <Info aria-hidden="true" className="size-4" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            aria-label={tema}
            side="top"
            sideOffset={2}
            collisionPadding={16}
            className="bg-surface-raised text-foreground border-border shadow-flotante animate-aparecer z-50 flex max-w-[min(20rem,calc(100vw-2rem))] items-start gap-2 rounded-xl border p-3 text-sm leading-relaxed"
          >
            <div className="flex-1">{children}</div>
            <Popover.Close
              aria-label="Cerrar"
              className="text-muted-foreground hover:text-foreground -m-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full"
            >
              <X aria-hidden="true" className="size-4" />
            </Popover.Close>
            <Popover.Arrow className="fill-surface-raised" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <span className="hidden text-sm print:inline"> ({children})</span>
    </>
  );
}
