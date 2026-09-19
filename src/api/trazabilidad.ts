/**
 * De dónde salió una respuesta del sistema (HU-18, S3-11).
 *
 * Los tipos salen de `generado/esquema.ts`, como pide ADR-008 §3.
 */

import { pedir } from "./cliente";
import type { components } from "./generado/esquema";

export type Traza = components["schemas"]["TrazabilidadSalida"];
export type RespaldoConversacional = components["schemas"]["RespaldoConversacionalSalida"];
export type RespaldoInstitucional = components["schemas"]["RespaldoInstitucionalSalida"];

/**
 * La traza de un turno del agente.
 *
 * El 404 no se traduce a `null` como en el historial: acá sí es un fallo. Sólo
 * se pide la traza de una respuesta que la pantalla ya está mostrando, así que
 * si el backend dice que no existe algo se desincronizó y hay que decirlo.
 */
export function obtenerTrazabilidad(sesionId: string, turno: number): Promise<Traza> {
  return pedir<Traza>(`/api/conversacion/${sesionId}/turnos/${turno}/trazabilidad`);
}
