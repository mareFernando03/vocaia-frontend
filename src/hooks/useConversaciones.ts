/**
 * Cómo nombrarle a la persona una conversación que no es la que está mirando.
 *
 * El perfil junta lo que la persona contó en todas sus conversaciones, y el
 * informe de una charla trae citas de otras. Sin decirlo, el informe de «Estoy
 * terminando el secundario» mostraba lo que había contado en otra charla sobre
 * primer año de Electrónica (recorrido local del 27/10). Se nombra por cómo
 * empezó y no por la fecha: dos charlas del mismo día tienen la misma.
 */

import { useEffect, useState } from "react";

import { listarSesiones } from "../api/conversacion";

/** Primer mensaje de cada conversación, por su identificador. Vacío hasta que llega. */
export function useInicios(activo: boolean): Map<string, string | null> {
  const [inicios, setInicios] = useState<Map<string, string | null>>(new Map());

  useEffect(() => {
    if (!activo) return;
    let vigente = true;
    listarSesiones().then(
      (sesiones) => {
        if (vigente) {
          setInicios(new Map(sesiones.map((s) => [s.sesion_id, s.vista_previa ?? null])));
        }
      },
      // Sin la lista, la cita igual dice que es de otra conversación.
      () => undefined,
    );
    return () => {
      vigente = false;
    };
  }, [activo]);

  return inicios;
}

export function enOtraConversacion(inicio: string | null | undefined): string {
  if (!inicio) return "Lo contaste en otra conversación.";
  const corto = inicio.length > 60 ? `${inicio.slice(0, 57).trimEnd()}…` : inicio;
  return `Lo contaste en otra conversación, la que empezaste con «${corto}».`;
}

/** Para el perfil, que no es de una conversación: dice de cuál salió la cita. */
export function enLaConversacion(inicio: string | null | undefined): string | null {
  if (!inicio) return null;
  const corto = inicio.length > 60 ? `${inicio.slice(0, 57).trimEnd()}…` : inicio;
  return `En la conversación que empezaste con «${corto}».`;
}
