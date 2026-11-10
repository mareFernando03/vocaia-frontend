import { Slot } from "radix-ui";
import type { ButtonHTMLAttributes, Ref } from "react";

import { clasesBoton, type Variante } from "./clases-boton";

/**
 * El botón de toda la interfaz.
 *
 * Había unas veinte copias de las mismas clases, y no eran iguales: a unas les
 * faltaba el hover, a otra la altura mínima. Acá la altura mínima de 44 px no
 * es una opción de tamaño: es lo que HU-08 fija para el área táctil, y ningún
 * botón la puede perder.
 *
 * Con `comoHijo` el estilo se aplica al elemento que va adentro, para que un
 * enlace (`<a>`) se vea como botón sin dejar de ser un enlace: el lector de
 * pantalla tiene que anunciar «enlace» si lo que hace es llevar a otro lado.
 */

interface Propiedades extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  comoHijo?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function Boton({
  variante = "secundario",
  comoHijo = false,
  className,
  type,
  ...resto
}: Propiedades) {
  if (comoHijo) {
    return <Slot.Root className={clasesBoton(variante, className)} {...resto} />;
  }
  // `type="button"` por defecto: dentro de un formulario, un botón sin tipo lo
  // envía, y casi nunca es lo que se quiere.
  return <button type={type ?? "button"} className={clasesBoton(variante, className)} {...resto} />;
}
