/**
 * «¿De dónde salió esto?» debajo de una respuesta (HU-18, S3-11).
 *
 * El criterio de aceptación tiene tres partes y cada una gobierna algo de acá:
 *
 * - **Una persona sin conocimiento técnico dice de dónde salió cada parte.** No
 *   aparecen puntajes, órdenes ni slugs; aparecen citas y nombres de fuentes.
 * - **Se distingue lo que contó ella de lo que dice la Facultad.** Dos bloques
 *   con rótulo propio, no una lista mezclada: el color ayuda, pero el rótulo es
 *   lo que lo dice, porque el color solo no le llega a quien no lo ve.
 * - **Lo que no tiene respaldo registrado se ve como tal.** Una respuesta sin
 *   nada detrás lo dice en voz alta, en lugar de mostrar dos bloques vacíos que
 *   se leen como «no cargó». Dice «no quedó registrado» y no «no hay respaldo»
 *   porque son dos cosas distintas y el contrato todavía no las separa.
 *
 * Va pegado a la burbuja y no en otra pantalla, por lo mismo que la evidencia
 * del perfil va dentro de cada rasgo: la fuente al lado de lo que sostiene.
 */

import { useCallback, useEffect, useState } from "react";

import { describir } from "../api/cliente";
import {
  obtenerTrazabilidad,
  type RespaldoConversacional,
  type RespaldoInstitucional,
  type Traza,
} from "../api/trazabilidad";

interface Propiedades {
  sesionId: string;
  turno: number;
}

export function Trazabilidad({ sesionId, turno }: Propiedades) {
  const [traza, setTraza] = useState<Traza | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setTraza(await obtenerTrazabilidad(sesionId, turno));
    } catch (fallo) {
      setError(describir(fallo));
    }
  }, [sesionId, turno]);

  useEffect(() => void cargar(), [cargar]);

  if (error !== null) {
    return (
      <p role="alert" className="text-destructive flex items-center gap-3 text-sm">
        <span>{error}</span>
        <button
          type="button"
          onClick={() => void cargar()}
          className="border-input hover:bg-primary-soft inline-flex min-h-11 items-center rounded-md border px-3"
        >
          Reintentar
        </button>
      </p>
    );
  }

  if (traza === null) {
    return <p className="text-muted-foreground text-sm">Buscando de dónde salió…</p>;
  }

  if (traza.sin_respaldo) {
    // El encuadre es texto fijo: no contesta nada, así que decir que «no tiene
    // respaldo» lo haría pasar por una afirmación suelta, que no es.
    if (traza.evidencia_leida_hasta === null) {
      return (
        <p className="text-muted-foreground text-sm">
          Es el mensaje de bienvenida: es igual para todos y no sale de nada que hayas contado.
        </p>
      );
    }
    // Que no haya traza no prueba que no haya habido respaldo: los turnos
    // anteriores a que se empezara a registrar la recuperación llegan acá con
    // la parte institucional vacía aunque hayan consultado el corpus. En la
    // pantalla que existe para decir de dónde salió cada cosa, afirmar «no se
    // apoya en nada» sería justamente lo que no se puede afirmar sin el dato.
    // Distinguir los dos casos necesita una marca del backend, que hoy no
    // existe en el contrato: el dato está en los metadatos de
    // `TURNO_REGISTRADO` y la traza no los expone.
    return (
      <p className="bg-accent-soft text-accent-foreground rounded-md p-3 text-sm">
        De esta respuesta <strong>no quedó registrado</strong> ningún respaldo: ni algo que hayas
        contado ni material de la Facultad. Puede que no se haya apoyado en nada, o que sea
        anterior a que VocaIA empezara a registrarlo. Tomala como una opinión de VocaIA, no como un
        dato.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
      <Conversacional respaldos={traza.conversacional} />
      <Institucional respaldos={traza.institucional} />
    </div>
  );
}

function Conversacional({ respaldos }: { respaldos: RespaldoConversacional[] }) {
  return (
    <section className="border-primary border-l-4 pl-3">
      <h3 className="font-medium">Lo que contaste vos</h3>
      {respaldos.length === 0 ? (
        <p className="text-muted-foreground mt-1">
          Nada: esta respuesta no se basó en algo que hayas contado.
        </p>
      ) : (
        <>
          {/* «Sabía» y no «se basó»: el backend devuelve lo que el sistema
              tenía leído al responder, no lo que efectivamente usó. Decir
              «se basó» le atribuiría a la respuesta un fundamento que puede no
              tener, que es el mismo cuidado que «consultada» y no «citada». */}
          <p className="text-muted-foreground mt-1">
            Lo que VocaIA ya sabía de vos cuando respondió. No quiere decir que haya usado todo.
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {respaldos.map((respaldo) => (
              <li key={respaldo.id}>
                <blockquote className="italic">«{respaldo.fragmento}»</blockquote>
                <p className="text-muted-foreground text-xs">
                  Lo dijiste el {fecha(respaldo.emitida_en)}.
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Institucional({ respaldos }: { respaldos: RespaldoInstitucional[] }) {
  // Primero lo citado: es lo que la respuesta afirma que dice la Facultad. Lo
  // consultado y no citado queda abajo, rotulado, porque también es parte de la
  // traza —el sistema lo tuvo delante—, pero no respalda ninguna frase.
  const ordenados = [...respaldos].sort(
    (a, b) => Number(b.citado) - Number(a.citado) || a.orden - b.orden,
  );
  const provisional = respaldos.some((r) => r.estado_validacion === "provisional");

  return (
    <section className="border-accent-strong border-l-4 pl-3">
      <h3 className="font-medium">Lo que dice la Facultad</h3>
      {respaldos.length === 0 ? (
        <p className="text-muted-foreground mt-1">
          Nada: para esta respuesta no se consultó material de la Facultad.
        </p>
      ) : (
        <>
          {/* Fuera de cualquier plegado, como en la conversación (R-002). */}
          {provisional && (
            <p className="text-muted-foreground mt-1">
              Datos <strong>provisionales</strong>, todavía sin validar por la Facultad.
            </p>
          )}
          <ul className="mt-2 flex flex-col gap-2">
            {ordenados.map((respaldo) => (
              <li key={respaldo.id}>
                <Referencia texto={respaldo.fuente} />
                <p className="text-muted-foreground text-xs">
                  {respaldo.citado
                    ? "La respuesta lo cita."
                    : "Se consultó, pero la respuesta no lo cita."}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/** Separa la ubicación del final del texto de la fuente, si la trae. */
const UBICACION = /\s+—\s+(\S+)$/;

export function Referencia({ texto }: { texto: string }) {
  const ubicacion = UBICACION.exec(texto);
  // Sin ubicación reconocible se muestra el texto entero y listo: una fuente
  // sin enlace se sigue pudiendo leer, y una fuente que no se muestra, no.
  if (ubicacion === null || !ubicacion[1].startsWith("http")) {
    return <span className="text-muted-foreground">{texto}</span>;
  }
  return (
    <a
      href={ubicacion[1]}
      target="_blank"
      rel="noreferrer"
      className="text-primary underline underline-offset-2"
    >
      {texto.slice(0, ubicacion.index)}
    </a>
  );
}

const FECHA = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long" });

function fecha(iso: string): string {
  return FECHA.format(new Date(iso));
}
