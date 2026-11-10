import { GraduationCap, History, MessageCircle, UserRound, type LucideIcon } from "lucide-react";

import { cn } from "../lib/cn";

/**
 * Las cuatro secciones de VocaIA.
 *
 * Dos formas, y en cada pantalla se ve una sola:
 *
 * - `inferior`, en el teléfono: una barra de pestañas abajo, donde llega el
 *   pulgar y donde la tienen las aplicaciones que la gente ya usa. Con el
 *   teclado abierto se esconde: ocuparía un tercio de lo poco que queda.
 * - `superior`, desde 40 rem: pestañas en la barra de arriba, al lado del logo,
 *   que es donde está la navegación en cualquier sitio.
 *
 * Siempre ícono **y** texto: un ícono solo obliga a adivinar, y adivinar es
 * justo lo que esta interfaz no le tiene que pedir a nadie.
 */

export type Seccion = "charla" | "historial" | "carreras" | "perfil";

const SECCIONES: { id: Seccion; etiqueta: string; Icono: LucideIcon }[] = [
  { id: "charla", etiqueta: "Charla", Icono: MessageCircle },
  { id: "historial", etiqueta: "Historial", Icono: History },
  { id: "carreras", etiqueta: "Carreras", Icono: GraduationCap },
  { id: "perfil", etiqueta: "Perfil", Icono: UserRound },
];

interface Propiedades {
  variante: "inferior" | "superior";
  activa: Seccion;
  alElegir: (seccion: Seccion) => void;
}

export function Navegacion({ variante, activa, alElegir }: Propiedades) {
  const inferior = variante === "inferior";
  return (
    <nav
      aria-label="Secciones"
      className={
        inferior
          ? // La marca `data-teclado` la pone `useTecladoVirtual`. La clase va
            // escrita entera porque Tailwind sólo genera las que encuentra.
            "border-border bg-surface/95 fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden print:hidden [[data-teclado]_&]:hidden"
          : "print:hidden"
      }
    >
      <ul className={inferior ? "mx-auto flex max-w-md" : "flex items-center gap-1"}>
        {SECCIONES.map(({ id, etiqueta, Icono }) => {
          const esActiva = id === activa;
          return (
            <li key={id} className={inferior ? "flex-1" : undefined}>
              <button
                type="button"
                aria-current={esActiva ? "page" : undefined}
                onClick={() => alElegir(id)}
                className={cn(
                  "font-medium transition-colors",
                  inferior
                    ? "flex h-16 w-full flex-col items-center justify-center gap-1 text-xs"
                    : "flex h-10 items-center gap-2 rounded-full px-3 text-sm md:px-4",
                  esActiva
                    ? cn("text-primary", !inferior && "bg-primary-soft")
                    : cn(
                        "text-muted-foreground hover:text-foreground",
                        !inferior && "hover:bg-primary-soft",
                      ),
                )}
              >
                {/* Abajo, la pestaña activa lleva una píldora detrás del ícono,
                    además del color: el color solo no alcanza para quien no lo
                    distingue. Arriba la píldora es el botón entero. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "inline-flex items-center justify-center transition-colors",
                    inferior && "h-7 w-14 rounded-full",
                    inferior && esActiva && "bg-primary-soft",
                  )}
                >
                  <Icono
                    className={inferior ? "size-5" : "size-4"}
                    strokeWidth={esActiva ? 2.4 : 2}
                  />
                </span>
                {etiqueta}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
