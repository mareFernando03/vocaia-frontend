import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/cn";

/**
 * Un recuadro que se tiene que leer: una salvedad, un dato que no coincide, la
 * mano tendida cuando la charla se corta.
 *
 * Tres tonos, y no son intercambiables:
 *
 * - `precaucion`, ámbar: algo sobre un dato. «Es un primer bosquejo», «las
 *   fuentes no coinciden».
 * - `apoyo`: cuando lo que importa ya no es la carrera sino la persona. Tiene su
 *   propio color para que no se confunda con una salvedad más.
 * - `info`, azul claro: algo que pasó y conviene saber. «Terminó esta parte de
 *   la charla».
 */

type Tono = "precaucion" | "apoyo" | "info";

const TONOS: Record<Tono, string> = {
  precaucion: "bg-accent-soft text-accent-foreground",
  apoyo: "bg-support-soft text-foreground border-support border-l-4",
  info: "bg-primary-soft text-foreground",
};

const ICONO: Record<Tono, string> = {
  precaucion: "text-accent-foreground",
  apoyo: "text-support",
  info: "text-primary",
};

interface Propiedades extends HTMLAttributes<HTMLDivElement> {
  tono?: Tono;
  icono?: ReactNode;
  children: ReactNode;
}

export function Aviso({ tono = "precaucion", icono, className, children, ...resto }: Propiedades) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl p-3 text-sm leading-relaxed sm:p-4",
        TONOS[tono],
        className,
      )}
      {...resto}
    >
      {icono !== undefined && (
        <span aria-hidden="true" className={cn("mt-0.5 shrink-0 [&_svg]:size-5", ICONO[tono])}>
          {icono}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">{children}</div>
    </div>
  );
}
