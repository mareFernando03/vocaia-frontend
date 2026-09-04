/**
 * Perfil vocacional con su evidencia (HU-13, S2-11).
 *
 * Los tipos salen de `generado/esquema.ts`, como pide ADR-008 §3: acá no se
 * declara a mano la forma de ninguna respuesta.
 */

import { pedir } from "./cliente";
import type { components } from "./generado/esquema";

export type Perfil = components["schemas"]["PerfilSalida"];
export type Rasgo = components["schemas"]["RasgoSalida"];
export type Evidencia = components["schemas"]["EvidenciaSalida"];
export type Objecion = components["schemas"]["ObjecionSalida"];

/**
 * El perfil de quien consulta. Nunca es un 404 ni un `null`.
 *
 * Quien todavía no conversó recibe un perfil donde ninguna dimensión afirma
 * nada, que es exactamente lo que el sistema sabe de esa persona. Por eso acá
 * no hay rama de «no existe»: el backend decidió que no existiera.
 */
export function obtenerPerfil(): Promise<Perfil> {
  return pedir<Perfil>("/api/perfil");
}

/**
 * Registra que lo que el perfil dice de una dimensión no representa a la
 * persona (HU-13, S2-12).
 *
 * No corrige el perfil: el backend sigue calculando lo mismo, porque lo que la
 * persona contó no cambió. Lo que queda asentado es el desacuerdo, y por eso
 * después de esto hay que volver a pedir el perfil —la objeción se recupera
 * adentro del rasgo, que es donde se lee—.
 */
export function objetar(dimension: string, motivo: string): Promise<Objecion> {
  return pedir<Objecion>("/api/perfil/objeciones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dimension, motivo }),
  });
}
