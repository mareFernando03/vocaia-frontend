import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";

import { conTransicionDeTema } from "../lib/transicion-tema";

/**
 * El tema de la interfaz: claro u oscuro.
 *
 * Sigue al sistema de la persona hasta que ella elige uno con el botón de la
 * barra superior. Lo elegido se guarda en `localStorage` de este navegador: es
 * una preferencia de cómo se ve, no un dato sobre la persona, y no viaja a
 * ningún lado. Si el navegador no deja guardar (ventana privada), se elige
 * igual y dura hasta cerrar la pestaña.
 *
 * El mismo cálculo está repetido en el script de `index.html`, que lo aplica
 * antes de dibujar para evitar un destello blanco al cargar. Si cambia acá,
 * cambia allá.
 */

export type Tema = "claro" | "oscuro";

const CLAVE = "vocaia:tema";
const CONSULTA_OSCURO = "(prefers-color-scheme: dark)";

function elegido(): Tema | null {
  try {
    const guardado = window.localStorage.getItem(CLAVE);
    return guardado === "claro" || guardado === "oscuro" ? guardado : null;
  } catch {
    return null;
  }
}

function aplicar(tema: Tema) {
  document.documentElement.dataset.tema = tema;
}

function delSistema(): Tema {
  return window.matchMedia?.(CONSULTA_OSCURO).matches ? "oscuro" : "claro";
}

export function useTema(): { tema: Tema; alternar: () => void } {
  const [preferido, setPreferido] = useState<Tema | null>(elegido);
  const [sistema, setSistema] = useState<Tema>(delSistema);
  const tema = preferido ?? sistema;

  useEffect(() => {
    aplicar(tema);
  }, [tema]);

  // Mientras no haya elegido, el cambio de tema del sistema (el teléfono que
  // pasa a oscuro de noche) se sigue en vivo.
  useEffect(() => {
    const consulta = window.matchMedia?.(CONSULTA_OSCURO);
    if (!consulta) return;
    const alCambiar = () => {
      const nuevo: Tema = consulta.matches ? "oscuro" : "claro";
      // Con un tema elegido, el del sistema se anota pero no se ve: no hay
      // nada que transicionar.
      if (elegido() !== null) {
        setSistema(nuevo);
        return;
      }
      conTransicionDeTema(() => {
        flushSync(() => setSistema(nuevo));
        aplicar(nuevo);
      });
    };
    consulta.addEventListener("change", alCambiar);
    return () => consulta.removeEventListener("change", alCambiar);
  }, []);

  const alternar = useCallback(() => {
    const nuevo: Tema = tema === "oscuro" ? "claro" : "oscuro";
    // `flushSync` y `aplicar` acá, y no en el efecto: la transición saca la
    // foto del estado final apenas vuelve esta función, y para entonces el
    // botón y el `<html>` ya tienen que estar en el tema nuevo.
    conTransicionDeTema(() => {
      flushSync(() => setPreferido(nuevo));
      aplicar(nuevo);
    });
    try {
      window.localStorage.setItem(CLAVE, nuevo);
    } catch {
      // Sin almacenamiento el cambio vale igual para esta pestaña.
    }
  }, [tema]);

  return { tema, alternar };
}
