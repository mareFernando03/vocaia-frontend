import { useCallback, useState } from "react";

/**
 * Aceptación del aviso de divulgación, con alcance de sesión (HU-02).
 *
 * Se guarda en `sessionStorage` y no en `localStorage` a propósito: el criterio
 * de aceptación habla de la sesión, y una pestaña nueva es una sesión nueva.
 * Sobrevive a recargar la página —volver a exigir la lectura tras un F5 sería
 * ruido, no cumplimiento— pero no convierte la aceptación en permanente.
 *
 * Esto registra la aceptación del lado del cliente, que es lo que gobierna la
 * interfaz. El registro en la bitácora de la sesión del backend es un evento
 * aparte y todavía no existe: ver la nota del PR.
 */

const CLAVE = "vocaia:aviso-ia:aceptado";

/** Momento de la aceptación, o `null`. No rompe si el almacenamiento falla. */
function leerAceptadoEn(): string | null {
  try {
    return window.sessionStorage.getItem(CLAVE);
  } catch {
    // Modo privado con almacenamiento bloqueado. Ante la duda el aviso se
    // muestra: mostrarlo de más es inocuo, omitirlo es incumplir RF-11.
    return null;
  }
}

export interface AvisoAceptado {
  /** `true` si ya lo aceptó en esta sesión. */
  aceptado: boolean;
  /** Momento de la aceptación en ISO 8601. Es el dato que va a necesitar el
   *  evento de bitácora del backend cuando exista. */
  aceptadoEn: string | null;
  aceptar: () => void;
}

export function useAvisoAceptado(): AvisoAceptado {
  const [aceptadoEn, setAceptadoEn] = useState<string | null>(leerAceptadoEn);

  const aceptar = useCallback(() => {
    const momento = new Date().toISOString();
    try {
      window.sessionStorage.setItem(CLAVE, momento);
    } catch {
      // Si no se puede persistir, la aceptación vale igual para esta carga de
      // la página: la persona leyó el aviso. Lo que se pierde es recordarlo
      // tras una recarga, y volver a mostrarlo es el fallo seguro.
    }
    setAceptadoEn(momento);
  }, []);

  return { aceptado: aceptadoEn !== null, aceptadoEn, aceptar };
}
