/**
 * Pantalla de conversación (HU-06 del lado del cliente, HU-07).
 *
 * Es deliberadamente sobria: la atención tiene que estar en lo que se está
 * contando, no en la interfaz. Todo el color sale de los tokens del sistema de
 * diseño; no hay un solo literal, que es lo que verifica
 * `npm run verificar-contraste`.
 */

import { useEffect, useRef, useState } from "react";

import { useConversacion } from "../hooks/useConversacion";

interface Propiedades {
  alSalir: () => Promise<void>;
}

export default function Conversacion({ alSalir }: Propiedades) {
  const { turnos, enCurso, cargando, enviando, error, intercambios, enviar, reintentar } =
    useConversacion();
  const [borrador, setBorrador] = useState("");
  const campo = useRef<HTMLTextAreaElement>(null);
  const finDeLista = useRef<HTMLDivElement>(null);

  // El foco vuelve al campo cuando termina el envío. Sin esto, quien escribe
  // con teclado queda sin punto de partida después de cada respuesta y tiene
  // que tabular desde el principio de la página.
  useEffect(() => {
    if (!enviando) campo.current?.focus();
  }, [enviando]);

  useEffect(() => {
    finDeLista.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turnos, enCurso]);

  async function mandar() {
    const texto = borrador;
    setBorrador("");
    await enviar(texto);
  }

  const vacia = turnos.length === 0 && enCurso === null;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-xl font-semibold">Tu conversación</h1>
        <div className="flex items-center gap-3">
          {/* Se cuentan intercambios y no turnos: en la base cada intervención
              es un turno, así que "turno 7" sería el cuarto que escribió la
              persona y nadie lo leería así. No se muestra un objetivo —"7 de
              18"— porque el presupuesto de la sesión vive en el instrumento
              del backend y el contrato no lo publica: inventarlo acá sería
              mostrar un número que nadie calculó. */}
          {intercambios > 0 && (
            <span className="text-muted-foreground text-sm tabular-nums">
              {intercambios} {intercambios === 1 ? "intercambio" : "intercambios"}
            </span>
          )}
          <button
            type="button"
            onClick={() => void alSalir()}
            className="border-input hover:bg-primary-soft inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* `aria-live` va acá y no en cada burbuja: lo que tiene que anunciarse
          es la respuesta a medida que se escribe. `polite` y no `assertive`
          para no interrumpir a quien todavía está leyendo lo anterior. */}
      <ol
        aria-live="polite"
        aria-busy={enviando}
        className="flex flex-1 flex-col gap-4 overflow-y-auto"
      >
        {cargando && (
          <li className="text-muted-foreground text-sm">Recuperando la conversación…</li>
        )}

        {!cargando && vacia && (
          <li className="text-muted-foreground text-sm">
            Contame por dónde andás: qué estás cursando o terminando, y qué te trajo hasta acá. No
            hace falta que tengas una respuesta armada.
          </li>
        )}

        {turnos.map((turno) => (
          <Burbuja key={turno.numero} rol={turno.rol} texto={turno.contenido} />
        ))}

        {enCurso !== null && (
          <>
            <Burbuja rol="usuario" texto={enCurso.usuario} />
            <Burbuja rol="agente" texto={enCurso.agente} escribiendo={enCurso.agente === ""} />
          </>
        )}

        <div ref={finDeLista} />
      </ol>

      {error !== null && (
        <p role="alert" className="text-destructive flex items-center gap-3 text-sm">
          <span>{error}</span>
          <button
            type="button"
            onClick={reintentar}
            className="border-input hover:bg-primary-soft inline-flex min-h-11 items-center rounded-md border px-3"
          >
            Reintentar
          </button>
        </p>
      )}

      <form
        className="flex items-end gap-2"
        onSubmit={(evento) => {
          evento.preventDefault();
          void mandar();
        }}
      >
        <label htmlFor="mensaje" className="sr-only">
          Escribí tu mensaje
        </label>
        <textarea
          id="mensaje"
          ref={campo}
          rows={2}
          value={borrador}
          disabled={enviando}
          onChange={(evento) => setBorrador(evento.target.value)}
          onKeyDown={(evento) => {
            // Enter manda, Shift+Enter hace un salto de línea. Es lo que la
            // gente ya espera de un campo de conversación.
            if (evento.key === "Enter" && !evento.shiftKey) {
              evento.preventDefault();
              void mandar();
            }
          }}
          placeholder="Escribí acá…"
          className="border-input bg-surface min-h-11 flex-1 resize-none rounded-md border p-3 text-sm"
        />
        <button
          type="submit"
          disabled={enviando || borrador.trim() === ""}
          className="bg-primary text-primary-foreground inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-medium disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}

interface PropiedadesBurbuja {
  rol: string;
  texto: string;
  escribiendo?: boolean;
}

function Burbuja({ rol, texto, escribiendo = false }: PropiedadesBurbuja) {
  const esPersona = rol === "usuario";
  return (
    <li className={esPersona ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          esPersona
            ? "bg-primary text-primary-foreground max-w-[85%] rounded-xl px-4 py-3 text-sm"
            : "bg-surface border-border max-w-[85%] rounded-xl border px-4 py-3 text-sm"
        }
      >
        {/* El rol se nombra para quien no ve la alineación ni el color: sin
            esto, un lector de pantalla lee dos textos seguidos sin saber quién
            dijo cada cosa. */}
        <span className="sr-only">{esPersona ? "Vos:" : "VocaIA:"}</span>
        {escribiendo ? (
          <span className="text-muted-foreground">Escribiendo…</span>
        ) : (
          <p className="whitespace-pre-wrap">{texto}</p>
        )}
      </div>
    </li>
  );
}
