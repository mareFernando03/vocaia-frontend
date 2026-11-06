import { useEffect, useRef, useState } from "react";

import { SesionVencida } from "../api/cliente";
import { consultarNotificacion } from "../api/notificacion";
import { ConsentimientoNotificacion } from "../componentes/ConsentimientoNotificacion";
import { NOTIFICACION } from "../contenido/aviso-notificacion";
import { hayQuePreguntar } from "../hooks/useAvisoPreguntado";

/**
 * La pregunta por el aviso a la Facultad, antes de empezar a chatear (S7-12,
 * VOCAIA-204, reunión con la Secretaría del 05/11).
 *
 * No es una puerta: el botón de seguir está siempre, autorice o no. Es la
 * misma sección del perfil, con el mismo texto y la misma versión, así que lo
 * que se otorga acá es lo mismo que se otorga allá.
 *
 * Si no hay nada que preguntar, sigue sola a la conversación, sin mostrarse.
 * Si la consulta falla, también: la pregunta no puede ser lo que impida
 * conversar, y en el perfil sigue estando.
 */
export default function PreguntaAviso({ alSeguir }: { alSeguir: () => void }) {
  const [preguntar, setPreguntar] = useState<boolean | null>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let vigente = true;
    consultarNotificacion().then(
      (estado) => vigente && setPreguntar(hayQuePreguntar(estado)),
      // La sesión vencida la resuelve App volviendo al ingreso.
      (fallo: unknown) => vigente && !(fallo instanceof SesionVencida) && setPreguntar(false),
    );
    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => {
    if (preguntar === false) alSeguir();
    // Al aparecer, el foco va al título: si no, quien usa lector de pantalla no
    // se entera de que en lugar de la conversación hay una pregunta.
    if (preguntar === true) tituloRef.current?.focus();
  }, [preguntar, alSeguir]);

  if (preguntar !== true) {
    return <p className="text-muted-foreground text-sm">Preparando la conversación…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 ref={tituloRef} tabIndex={-1} className="text-xl font-semibold outline-none">
          {NOTIFICACION.antesDeEmpezar}
        </h1>
        <p className="text-muted-foreground text-sm">{NOTIFICACION.antesDeEmpezarIntro}</p>
      </div>
      <ConsentimientoNotificacion />
      <div>
        <button
          type="button"
          onClick={alSeguir}
          className="border-input hover:bg-primary-soft inline-flex min-h-11 items-center rounded-md border px-4 font-medium"
        >
          {NOTIFICACION.seguir}
        </button>
      </div>
    </div>
  );
}
