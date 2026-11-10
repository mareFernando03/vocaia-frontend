import { Moon, Sun } from "lucide-react";

import { useTema } from "../hooks/useTema";
import { cn } from "../lib/cn";
import { BotonIcono } from "./ui/BotonIcono";

/**
 * El botón para pasar del tema claro al oscuro y al revés.
 *
 * Muestra el ícono del tema al que se va a pasar, y su nombre accesible dice la
 * acción entera: «Usar el tema oscuro». Un interruptor que sólo dice «Tema»
 * obliga a adivinar en qué estado está.
 *
 * Los dos íconos están siempre dibujados, uno encima del otro, y al cambiar uno
 * se va girando y achicándose mientras el otro entra: así se ve que el botón
 * hizo algo, y no que el ícono se reemplazó de golpe. Durante el fundido de la
 * página este ícono queda afuera de la foto (`icono-tema` en `styles.css`) para
 * que se lo vea girar.
 */

const ICONO = "col-start-1 row-start-1 transition-[rotate,scale,opacity] duration-300 ease-out";
const VISIBLE = "rotate-0 scale-100 opacity-100";

export function SelectorTema() {
  const { tema, alternar } = useTema();
  const aOscuro = tema === "claro";
  return (
    <BotonIcono
      etiqueta={aOscuro ? "Usar el tema oscuro" : "Usar el tema claro"}
      onClick={alternar}
    >
      <span aria-hidden="true" className="icono-tema grid place-items-center">
        <Moon className={cn(ICONO, aOscuro ? VISIBLE : "-rotate-90 scale-50 opacity-0")} />
        <Sun className={cn(ICONO, aOscuro ? "rotate-90 scale-50 opacity-0" : VISIBLE)} />
      </span>
    </BotonIcono>
  );
}
