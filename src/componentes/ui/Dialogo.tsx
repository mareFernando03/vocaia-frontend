import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import type { ReactElement, ReactNode } from "react";

import { cn } from "../../lib/cn";

/**
 * Una ventana sobre la pantalla.
 *
 * Trae lo que una ventana tiene que traer y que es fácil olvidarse: el foco
 * entra al abrir y vuelve al botón que la abrió al cerrar, el Tab no se escapa
 * al fondo, Escape cierra, y el lector de pantalla la anuncia con su título.
 *
 * En el teléfono sube desde abajo y ocupa el ancho: es donde llega el pulgar y
 * es lo que la gente ya conoce de las aplicaciones que usa. Desde 40 rem es una
 * ventana centrada.
 *
 * Va en un portal. Abierta desde una burbuja de la conversación, quedaba dentro
 * de la región `aria-live` y se anunciaba como parte de la respuesta.
 */
export function Dialogo({
  titulo,
  abierto,
  alCambiar,
  disparador,
  children,
  className,
}: {
  titulo: string;
  abierto: boolean;
  alCambiar: (abierto: boolean) => void;
  disparador: ReactElement;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Root open={abierto} onOpenChange={alCambiar}>
      <Dialog.Trigger asChild>{disparador}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-overlay animate-aparecer fixed inset-0 z-40" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            "bg-surface-raised text-foreground border-border shadow-flotante animate-subir fixed z-50 flex flex-col overflow-hidden border text-sm outline-none",
            "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl pb-[env(safe-area-inset-bottom)]",
            "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[80dvh] sm:w-[min(36rem,calc(100%-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:pb-0",
            className,
          )}
        >
          <div className="border-border flex items-center justify-between gap-3 border-b py-2 ps-5 pe-2">
            <Dialog.Title className="text-base font-semibold">{titulo}</Dialog.Title>
            <Dialog.Close
              aria-label="Cerrar"
              className="text-muted-foreground hover:text-foreground hover:bg-primary-soft inline-flex size-11 items-center justify-center rounded-full"
            >
              <X aria-hidden="true" className="size-5" />
            </Dialog.Close>
          </div>
          <div className="overflow-y-auto p-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
