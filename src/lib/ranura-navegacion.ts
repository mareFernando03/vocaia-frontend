import { createContext, useContext } from "react";

/**
 * El lugar de la barra superior donde van las pestañas en pantallas anchas.
 *
 * La barra la dibuja `App`, pero las pestañas y la sección activa son de
 * `Autenticado`. En vez de subir ese estado hasta `App` —que no tiene por qué
 * saber qué secciones hay—, `App` ofrece el lugar y `Autenticado` dibuja ahí
 * con un portal. Sin sesión el lugar queda vacío.
 */
export const RanuraNavegacion = createContext<HTMLElement | null>(null);

export function useRanuraNavegacion(): HTMLElement | null {
  return useContext(RanuraNavegacion);
}
