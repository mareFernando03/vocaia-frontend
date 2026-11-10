import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/cn";

/**
 * La superficie que agrupa una cosa: una carrera, una dimensión del perfil, una
 * conversación del historial.
 *
 * El elemento lo elige quien la usa, porque no siempre es lo mismo: una ficha
 * de carrera es un `article` que se entiende sola, un ítem del historial es un
 * `li` de una lista. La tarjeta no impone semántica, sólo aspecto.
 */

type Elemento = "article" | "section" | "div" | "li";

interface Propiedades extends HTMLAttributes<HTMLElement> {
  como?: Elemento;
  children: ReactNode;
}

export function Tarjeta({ como: Como = "div", className, children, ...resto }: Propiedades) {
  return (
    <Como
      className={cn(
        "bg-surface border-border shadow-tarjeta flex flex-col gap-3 rounded-2xl border p-4 sm:p-5",
        className,
      )}
      {...resto}
    >
      {children}
    </Como>
  );
}
