/**
 * El informe del cierre de una sesión (HU-16, S4-04).
 *
 * Pedirlo es lo único que hace el cliente: el backend emite `informe_visto` al
 * leerlo, así que acá no se registra nada aparte. Los tipos salen de
 * `generado/esquema.ts`, como pide ADR-008 §3.
 */

import { pedir } from "./cliente";
import type { components } from "./generado/esquema";

export type Informe = components["schemas"]["InformeSalida"];
export type CarreraInforme = components["schemas"]["CarreraInformeSalida"];
export type EvidenciaInforme = components["schemas"]["EvidenciaInformeSalida"];
export type Habilitantes = components["schemas"]["HabilitantesSalida"];
export type Habilitante = components["schemas"]["HabilitanteSalida"];

/**
 * El 404 (inexistente o ajena) y el 409 (todavía no cerró, o se está armando)
 * llegan como `ErrorDeApi` con el texto del backend, que ya está escrito para
 * la persona.
 */
export function obtenerInforme(sesionId: string): Promise<Informe> {
  return pedir<Informe>(`/api/informe/${sesionId}`);
}
