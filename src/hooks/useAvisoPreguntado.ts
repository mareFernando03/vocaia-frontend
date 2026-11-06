import { useCallback, useEffect, useState } from "react";

import type { Notificacion } from "../api/notificacion";
import { alCambiarSesion } from "../auth/sesion";
import { NOTIFICACION } from "../contenido/aviso-notificacion";

/**
 * Si ya se le preguntó a la persona por el aviso a la Facultad en esta sesión
 * (S7-12, VOCAIA-204).
 *
 * La pregunta va antes de la conversación porque en el perfil casi nadie la
 * encontraba (reunión con la Secretaría del 05/11). Se hace una vez por
 * ingreso y no una sola vez para siempre: quien contestó «ahora no» puede
 * cambiar de idea, y la próxima vez que entre se le vuelve a ofrecer. Quien
 * lo dejó de autorizar a propósito no vuelve a verla: eso lo decide
 * `PreguntaAviso` con lo que responde el backend.
 *
 * Es el mismo patrón que `useAvisoAceptado`: `sessionStorage`, para que un F5
 * en medio de la charla no la vuelva a interrumpir, y se olvida al perder la
 * sesión, para que la persona siguiente en la misma pestaña tenga su pregunta.
 */

const CLAVE = "vocaia:aviso-facultad:preguntado";

function leer(): boolean {
  try {
    return window.sessionStorage.getItem(CLAVE) === "si";
  } catch {
    // Con el almacenamiento bloqueado se vuelve a preguntar tras un F5. Es
    // molesto, no grave: la pregunta tiene un botón para seguir.
    return false;
  }
}

export interface AvisoPreguntado {
  preguntado: boolean;
  /** Se llama al seguir a la conversación, haya autorizado o no. */
  marcar: () => void;
}

export function useAvisoPreguntado(): AvisoPreguntado {
  const [preguntado, setPreguntado] = useState(leer);

  const marcar = useCallback(() => {
    try {
      window.sessionStorage.setItem(CLAVE, "si");
    } catch {
      // Vale igual para esta carga de la página.
    }
    setPreguntado(true);
  }, []);

  useEffect(
    () =>
      alCambiarSesion((token) => {
        if (token !== null) return;
        try {
          window.sessionStorage.removeItem(CLAVE);
        } catch {
          // Si no se puede borrar, al menos esta carga vuelve a preguntar.
        }
        setPreguntado(false);
      }),
    [],
  );

  return { preguntado, marcar };
}

/**
 * Se pregunta a quien todavía no decidió: nunca lo autorizó, o lo autorizó
 * sobre un texto anterior. No a quien ya lo tiene autorizado, ni a quien lo
 * dejó de autorizar —ya decidió—, ni a quien no comparte un correo, que no
 * podría autorizarlo.
 */
export function hayQuePreguntar(estado: Notificacion): boolean {
  if (!estado.hay_contacto) return false;
  if (estado.vigente) return estado.version !== NOTIFICACION.version;
  return !estado.revocado_en;
}
