/**
 * Corpus institucional de carreras (HU-15, S3-05).
 *
 * Ninguno de estos pedidos pasa por el modelo: el backend devuelve el texto tal
 * como se indexó, con su fuente pegada. Los tipos salen de `generado/esquema.ts`.
 */

import { pedir } from "./cliente";
import type { components } from "./generado/esquema";

export type Carrera = components["schemas"]["CarreraSalida"];
export type CoincidenciaCarrera = components["schemas"]["CoincidenciaCarreraSalida"];

/** El catálogo completo. Vacío si el corpus todavía no se indexó. */
export function listarCarreras(): Promise<Carrera[]> {
  return pedir<Carrera[]>("/api/carreras");
}

/** Las carreras más parecidas a lo que la persona describe, de más a menos. */
export function buscarCarreras(texto: string): Promise<CoincidenciaCarrera[]> {
  return pedir<CoincidenciaCarrera[]>(`/api/carreras/buscar?${new URLSearchParams({ texto })}`);
}
