/**
 * Consentimiento para avisar a la Facultad ante una señal de riesgo (HU-03b).
 *
 * Los tipos salen de `generado/esquema.ts`, como pide ADR-008 §3.
 */

import { pedir } from "./cliente";
import type { components } from "./generado/esquema";

export type Notificacion = components["schemas"]["NotificacionSalida"];

/** Sin ningún acto registrado, el backend responde `vigente: false`. */
export function consultarNotificacion(): Promise<Notificacion> {
  return pedir<Notificacion>("/api/identidad/notificacion");
}

/** Registra el otorgamiento con la versión del texto que la persona leyó. */
export function otorgarNotificacion(version: string): Promise<Notificacion> {
  return pedir<Notificacion>("/api/identidad/notificacion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version }),
  });
}

/**
 * Registra la revocación. No toca la sesión: es un `POST` que deja constancia,
 * no un «salir», y el consentimiento de tratamiento sigue vigente.
 */
export function revocarNotificacion(): Promise<Notificacion> {
  return pedir<Notificacion>("/api/identidad/notificacion/revocar", { method: "POST" });
}
