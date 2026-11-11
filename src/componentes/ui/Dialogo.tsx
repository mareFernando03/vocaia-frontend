import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useRef, type ReactElement, type ReactNode } from "react";

import { cn } from "../../lib/cn";

/**
 * Una ventana sobre la pantalla.
 *
 * Trae lo que una ventana tiene que traer y que es fácil olvidarse: el foco
 * entra al abrir, Tab no se escapa al fondo y el lector de pantalla la anuncia
 * con su título. Sin disparador, la decisión del pie es la que cierra la ventana.
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
  pie,
}: {
  titulo: string;
  abierto: boolean;
  children: ReactNode;
  className?: string;
  pie?: ReactNode;
} & (
  | { disparador: ReactElement; alCambiar: (abierto: boolean) => void }
  | { disparador?: never; alCambiar?: never }
)) {
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const automatico = disparador === undefined;

  return (
    <Dialog.Root open={abierto} onOpenChange={alCambiar}>
      {disparador && <Dialog.Trigger asChild>{disparador}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="bg-overlay animate-aparecer fixed inset-0 z-40 print:hidden" />
        <Dialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(evento) => {
            if (!automatico) return;
            evento.preventDefault();
            tituloRef.current?.focus();
          }}
          onEscapeKeyDown={(evento) => {
            if (automatico) evento.preventDefault();
          }}
          onPointerDownOutside={(evento) => {
            if (automatico) evento.preventDefault();
          }}
          className={cn(
            "bg-surface-raised text-foreground border-border shadow-flotante animate-subir fixed z-50 flex flex-col overflow-hidden border text-sm outline-none print:hidden",
            "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl pb-[env(safe-area-inset-bottom)]",
            "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[80dvh] sm:w-[min(36rem,calc(100%-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:pb-0",
            className,
          )}
        >
          <div
            className={cn(
              "border-border flex shrink-0 items-center justify-between gap-3 border-b",
              automatico ? "px-5 py-4" : "py-2 ps-5 pe-2",
            )}
          >
            <Dialog.Title
              ref={tituloRef}
              tabIndex={automatico ? -1 : undefined}
              className={cn("font-semibold", automatico ? "text-lg outline-none" : "text-base")}
            >
              {titulo}
            </Dialog.Title>
            {!automatico && (
              <Dialog.Close
                aria-label="Cerrar"
                className="text-muted-foreground hover:text-foreground hover:bg-primary-soft inline-flex size-11 items-center justify-center rounded-full"
              >
                <X aria-hidden="true" className="size-5" />
              </Dialog.Close>
            )}
          </div>
          <div
            tabIndex={automatico ? 0 : undefined}
            role={automatico ? "region" : undefined}
            aria-label={automatico ? "Detalles del diálogo" : undefined}
            className="min-h-0 overflow-y-auto p-5 focus-visible:outline-offset-[-2px]"
          >
            {children}
          </div>
          {pie && <div className="border-border shrink-0 border-t px-5 py-3">{pie}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
