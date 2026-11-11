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

import { Info } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

import { describir } from "../api/cliente";
import {
  obtenerTrazabilidad,
  type RespaldoConversacional,
  type RespaldoInstitucional,
  type Traza,
} from "../api/trazabilidad";
import { Referencia } from "./Referencia";
import { clasesBoton } from "./ui/clases-boton";

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
        <button type="button" onClick={() => void cargar()} className={clasesBoton("secundario")}>
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
        contado ni material de la Facultad. Puede que no se haya apoyado en nada, o que sea anterior
        a que VocaIA empezara a registrarlo. Tomala como una opinión de VocaIA, no como un dato.
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
          {/* A la vista sólo lo del último mensaje que VocaIA tenía leído: el
              backend manda todo lo acumulado de la sesión, y en una charla
              larga eran unas treinta frases debajo de cada respuesta (prueba
              del piloto). El resto queda a un clic. */}
          <Citas respaldos={recientes(respaldos)} />
          {respaldos.length > recientes(respaldos).length && (
            <details className="mt-2">
              <summary className="text-primary cursor-pointer">
                Y {respaldos.length - recientes(respaldos).length} cosas más que ya sabía de vos
              </summary>
              <Citas respaldos={respaldos.filter((r) => !recientes(respaldos).includes(r))} />
            </details>
          )}
        </>
      )}
    </section>
  );
}

function recientes(respaldos: RespaldoConversacional[]): RespaldoConversacional[] {
  // Por fecha y no por número de turno: el perfil junta evidencia de todas las
  // sesiones de la persona, y «turno 3» solo no dice de cuál.
  const ultimo = respaldos.reduce((a, b) => (b.emitida_en > a.emitida_en ? b : a));
  return respaldos.filter((r) => r.sesion_id === ultimo.sesion_id && r.turno === ultimo.turno);
}

function Citas({ respaldos }: { respaldos: RespaldoConversacional[] }) {
  return (
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
  );
}

function Institucional({ respaldos }: { respaldos: RespaldoInstitucional[] }) {
  // Primero lo citado: es lo que la respuesta afirma que dice la Facultad. Lo
  // consultado y no citado queda abajo, rotulado, porque también es parte de la
  // traza —el sistema lo tuvo delante—, pero no respalda ninguna frase.
  // Una línea por fuente, y si un fragmento de ella se citó, la que queda es
  // ésa: el orden pone lo citado primero (los horarios van uno por año).
  const ordenados = [...respaldos]
    .sort((a, b) => Number(b.citado) - Number(a.citado) || a.orden - b.orden)
    .filter((r, i, todos) => todos.findIndex((otro) => otro.fuente === r.fuente) === i);
  const provisional = respaldos.some((r) => r.estado_validacion === "provisional");
  const citados = ordenados.filter((r) => r.citado);
  const idDeLista = useId();
  const consultados = ordenados.filter((r) => !r.citado);

  return (
    <section className="border-accent-strong border-l-4 pl-3">
      <h3 className="font-medium">Lo que dice la Facultad</h3>
      {respaldos.length === 0 ? (
        <p className="text-muted-foreground mt-1">
          Nada: para esta respuesta no se consultó material de la Facultad.
        </p>
      ) : (
        <>
          {/* Fuera de cualquier plegado, como en la conversación (R-002). Además de que
              falta validarlo, dice de dónde sale —lo que publica la propia
              Facultad— y qué hacer con eso (producción, 11/11). */}
          {provisional && (
            <p className="bg-accent-soft text-accent-foreground mt-2 flex gap-2 rounded-md p-3">
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>
                <strong>Datos provisionales.</strong> Salen de lo que publica la Facultad, que
                todavía no los revisó para VocaIA. Si algo pesa en tu decisión, confirmalo con ella.
              </span>
            </p>
          )}
          {citados.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {citados.map((respaldo) => (
                <li key={respaldo.id}>
                  <Referencia texto={respaldo.fuente} />
                  <p className="text-muted-foreground text-xs">La respuesta lo cita.</p>
                </li>
              ))}
            </ul>
          )}
          {/* Lo consultado y no citado va junto y con un solo rótulo: repetido
              debajo de cada fuente, cinco veces «no lo cita» tapaba lo que sí
              importa, que es si la respuesta se apoyó en algo. */}
          {consultados.length > 0 && (
            <div className="mt-3">
              <p id={`consultadas-${idDeLista}`} className="text-muted-foreground text-xs">
                {citados.length > 0
                  ? "También se consultó, pero la respuesta no lo cita:"
                  : "La respuesta no cita ninguna. Esto es lo que VocaIA tuvo a mano:"}
              </p>
              <ul
                aria-labelledby={`consultadas-${idDeLista}`}
                className="mt-1 flex flex-col gap-1.5"
              >
                {consultados.map((respaldo) => (
                  <li key={respaldo.id}>
                    <Referencia texto={respaldo.fuente} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

const FECHA = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long" });

function fecha(iso: string): string {
  return FECHA.format(new Date(iso));
}
