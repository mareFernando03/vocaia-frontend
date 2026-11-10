import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Junta clases de Tailwind y resuelve las que chocan a favor de la última.
 *
 * Es lo que deja que un componente traiga su estilo y que quien lo usa le
 * cambie una sola cosa —`<Boton className="w-full">`— sin que las dos clases de
 * ancho queden peleando según el orden en que las generó Tailwind.
 */
export function cn(...clases: ClassValue[]): string {
  return twMerge(clsx(clases));
}
