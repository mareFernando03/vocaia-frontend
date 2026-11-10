import { useEffect, useRef, useState } from "react";

import { describir, SesionVencida } from "../api/cliente";
import { consultarNotificacion } from "../api/notificacion";
import { ConsentimientoNotificacion } from "../componentes/ConsentimientoNotificacion";
import { NOTIFICACION } from "../contenido/aviso-notificacion";
import { hayQuePreguntar } from "../hooks/useAvisoPreguntado";
import { clasesBoton } from "../componentes/ui/clases-boton";

/**
 * Cuánto se espera la consulta antes de darla por fallida. Alcanza para el
 * arranque en frío de Render, que tarda de 30 a 50 segundos: con menos, el
 * primer ingreso del día fallaría casi siempre.
 */
export const TOPE_CONSULTA_MS = 60_000;

/**
 * La pregunta por el aviso a la Facultad, antes de empezar a chatear (S7-12,
 * VOCAIA-204, reunión con la Secretaría del 05/11).
 *
 * No es una puerta: el botón de seguir está siempre, autorice o no. Es la
 * misma sección del perfil, con el mismo texto y la misma versión, así que lo
 * que se otorga acá es lo mismo que se otorga allá.
 *
 * Si no hay nada que preguntar, sigue sola a la conversación, sin mostrarse.
 * Si la consulta falla —o no responde en `TOPE_CONSULTA_MS`— lo dice, y ofrece
 * reintentar o seguir igual. Seguir no da la pregunta por hecha: se repite al
 * recargar o en el próximo ingreso, y en el perfil sigue estando.
 */
export default function PreguntaAviso({
  alSeguir,
  alFallarLaConsulta,
}: {
  alSeguir: () => void;
  /** Seguir a la conversación después de un fallo, sin dar la pregunta por hecha. */
  alFallarLaConsulta: () => void;
}) {
  const [preguntar, setPreguntar] = useState<boolean | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  // Cuenta los fallos para que el mismo mensaje, repetido después de
  // «Reintentar», vuelva a insertarse y un lector de pantalla lo anuncie.
  const [fallos, setFallos] = useState(0);
  // Cambia con «Reintentar»: vuelve a correr la consulta.
  const [intento, setIntento] = useState(0);
  const tituloRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let vigente = true;
    const control = new AbortController();
    const tope = setTimeout(() => control.abort(), TOPE_CONSULTA_MS);
    consultarNotificacion({ signal: control.signal })
      .then(
        (estado) => {
          if (!vigente) return;
          setFallo(null);
          setPreguntar(hayQuePreguntar(estado));
        },
        (error: unknown) => {
          // La sesión vencida la resuelve App volviendo al ingreso.
          if (!vigente || error instanceof SesionVencida) return;
          setFallo(describir(error));
          setFallos((n) => n + 1);
        },
      )
      .finally(() => clearTimeout(tope));
    return () => {
      vigente = false;
      clearTimeout(tope);
      control.abort();
    };
  }, [intento]);

  const hayFallo = fallo !== null;
  useEffect(() => {
    if (preguntar === false) alSeguir();
    // Al aparecer, el foco va al título: si no, quien usa lector de pantalla no
    // se entera de que en lugar de la conversación hay una pregunta. Con un
    // fallo, sólo la primera vez: después de «Reintentar» queda en el botón.
    if (preguntar === true || hayFallo) tituloRef.current?.focus();
  }, [preguntar, hayFallo, alSeguir]);

  if (fallo !== null) {
    return (
      <div className="flex flex-col gap-4">
        <h1 ref={tituloRef} tabIndex={-1} className="text-xl font-semibold outline-none">
          {NOTIFICACION.antesDeEmpezar}
        </h1>
        <div key={fallos} role="alert" className="flex flex-col gap-1 text-sm">
          <p className="text-destructive">
            {NOTIFICACION.consultaFallida} {fallo}
          </p>
          <p className="text-muted-foreground">{NOTIFICACION.consultaFallidaSeguir}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Reintentar deja el aviso a la vista hasta que llega la respuesta:
              si se borrara al empezar, el botón se desmontaría con el foco
              adentro y quien usa teclado caería al `body`. */}
          <button
            type="button"
            onClick={() => setIntento((n) => n + 1)}
            className={clasesBoton("secundario")}
          >
            {NOTIFICACION.reintentar}
          </button>
          <button type="button" onClick={alFallarLaConsulta} className={clasesBoton("secundario")}>
            {NOTIFICACION.seguir}
          </button>
        </div>
      </div>
    );
  }

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
        <button type="button" onClick={alSeguir} className={clasesBoton("secundario")}>
          {NOTIFICACION.seguir}
        </button>
      </div>
    </div>
  );
}
