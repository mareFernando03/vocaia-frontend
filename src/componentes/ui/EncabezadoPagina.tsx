import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "../../lib/cn";

/**
 * El título de una pantalla, con sus acciones al costado.
 *
 * Al aparecer, el foco va al título. La navegación no cambia de dirección, así
 * que el navegador no mueve el foco solo: sin esto, quien usa teclado o lector
 * de pantalla toca «Carreras» y sigue parado en el botón de antes, sin
 * enterarse de que la pantalla cambió.
 */
export function EncabezadoPagina({
  titulo,
  acciones,
  children,
  enfocar = true,
  className,
}: {
  titulo: ReactNode;
  acciones?: ReactNode;
  /** Lo que va debajo del título: una fecha, una línea de contexto. */
  children?: ReactNode;
  enfocar?: boolean;
  className?: string;
}) {
  const h1 = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (enfocar) h1.current?.focus({ preventScroll: true });
  }, [enfocar]);

  return (
    <header className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <h1
          ref={h1}
          tabIndex={-1}
          className="text-2xl font-semibold tracking-tight outline-none sm:text-3xl"
        >
          {titulo}
        </h1>
        {acciones !== undefined && (
          <div className="flex flex-wrap items-center gap-2 print:hidden">{acciones}</div>
        )}
      </div>
      {children}
    </header>
  );
}
