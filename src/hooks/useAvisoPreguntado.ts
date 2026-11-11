import { useCallback, useEffect, useState } from "react";

import type { Notificacion } from "../api/notificacion";
import { alCambiarSesion } from "../auth/sesion";
import { NOTIFICACION } from "../contenido/aviso-notificacion";

function claveRechazo(cuenta: string): string {
  return `vocaia:aviso-facultad:rechazado:${cuenta}`;
}

/**
 * El servidor guarda otorgamientos y revocaciones. Cuando no hay un acto
 * previo que revocar, se recuerda el rechazo inicial por cuenta y versión
 * en este navegador. Sólo se guarda el identificador opaco.
 */
export function recordarRechazo(cuenta: string): void {
  try {
    window.localStorage.setItem(claveRechazo(cuenta), NOTIFICACION.version);
  } catch {
    // La decisión vale en este ingreso aunque el navegador impida recordarla.
  }
}

export function olvidarRechazo(cuenta: string): void {
  try {
    window.localStorage.removeItem(claveRechazo(cuenta));
  } catch {
    // Con el almacenamiento bloqueado tampoco se usa la marca para decidir.
  }
}

/** Evita volver a consultar al recargar durante una charla. */
export function useAvisoPreguntado(cuenta: string) {
  const clave = `vocaia:aviso-facultad:preguntado:${cuenta}`;
  const [preguntado, setPreguntado] = useState(() => {
    try {
      return window.sessionStorage.getItem(clave) === NOTIFICACION.version;
    } catch {
      return false;
    }
  });

  const marcar = useCallback(() => {
    try {
      window.sessionStorage.setItem(clave, NOTIFICACION.version);
    } catch {
      // Vale igual para esta carga de la página.
    }
    setPreguntado(true);
  }, [clave]);

  useEffect(
    () =>
      alCambiarSesion((token) => {
        if (token !== null) return;
        try {
          window.sessionStorage.removeItem(clave);
        } catch {
          // Si no se puede borrar, al menos esta carga vuelve a preguntar.
        }
        setPreguntado(false);
      }),
    [clave],
  );

  return { preguntado, marcar };
}

/** El estado del servidor tiene prioridad sobre el rechazo local. */
export function hayQuePreguntar(estado: Notificacion, cuenta: string): boolean {
  if (!estado.hay_contacto) return false;
  if (estado.vigente) return estado.version !== NOTIFICACION.version;
  if (estado.revocado_en) return false;
  try {
    return window.localStorage.getItem(claveRechazo(cuenta)) !== NOTIFICACION.version;
  } catch {
    return true;
  }
}
