import { useCallback, useState } from "react";

import { AVISO } from "../contenido/aviso-ia";

/**
 * Aceptación del aviso de divulgación, con alcance de sesión (HU-02, HU-03a).
 *
 * Se guarda en `sessionStorage` y no en `localStorage` a propósito: el criterio
 * de aceptación habla de la sesión, y una pestaña nueva es una sesión nueva.
 * Sobrevive a recargar la página —volver a exigir la lectura tras un F5 sería
 * ruido, no cumplimiento— pero no convierte la aceptación en permanente.
 *
 * **Aceptar el aviso es también dar el consentimiento informado.** Son un solo
 * acto y no dos pantallas: la puerta ya bloquea la aplicación antes del
 * ingreso, así que nadie llega a identificarse sin haber leído qué es el
 * sistema y qué hace con lo que le cuenta. Por eso lo que se guarda acá es la
 * **versión** aceptada, que es lo que el backend registra al crear la
 * identidad.
 */

const CLAVE = "vocaia:aviso-ia:aceptado";

/** Versión aceptada en esta sesión, o `null`. No rompe si el almacenamiento falla. */
export function versionAceptada(): string | null {
  try {
    return window.sessionStorage.getItem(CLAVE);
  } catch {
    // Modo privado con almacenamiento bloqueado. Ante la duda el aviso se
    // muestra: mostrarlo de más es inocuo, omitirlo es incumplir RF-11.
    return null;
  }
}

export interface AvisoAceptado {
  /** `true` si aceptó **esta** versión del aviso en esta sesión. */
  aceptado: boolean;
  /** La versión que aceptó, o `null`. Es lo que viaja al backend. */
  version: string | null;
  aceptar: () => void;
}

export function useAvisoAceptado(): AvisoAceptado {
  const [version, setVersion] = useState<string | null>(versionAceptada);

  const aceptar = useCallback(() => {
    try {
      window.sessionStorage.setItem(CLAVE, AVISO.version);
    } catch {
      // Si no se puede persistir, la aceptación vale igual para esta carga de
      // la página: la persona leyó el aviso. Lo que se pierde es recordarlo
      // tras una recarga, y volver a mostrarlo es el fallo seguro.
    }
    setVersion(AVISO.version);
  }, []);

  // Se compara contra la versión vigente y no contra `null`: si el aviso
  // cambió, lo que la persona aceptó ya no es lo que dice la pantalla y la
  // puerta se vuelve a mostrar. Es para lo que sirve versionarlo.
  return { aceptado: version === AVISO.version, version, aceptar };
}
