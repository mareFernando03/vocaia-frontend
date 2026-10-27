/**
 * Pantalla de conversación (HU-06 del lado del cliente, HU-07).
 *
 * Es deliberadamente sobria: la atención tiene que estar en lo que se está
 * contando, no en la interfaz. Todo el color sale de los tokens del sistema de
 * diseño; no hay un solo literal, que es lo que verifica
 * `npm run verificar-contraste`.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";

import { obtenerEncuadre, type Fuente } from "../api/conversacion";
import { Prosa } from "../componentes/Prosa";
import { Referencia } from "../componentes/Referencia";
import { Trazabilidad } from "../componentes/Trazabilidad";
import { useConversacion } from "../hooks/useConversacion";

interface Propiedades {
  alSalir: () => Promise<void>;
  alVerHistorial: () => void;
  alVerPerfil: () => void;
  alVerCarreras: () => void;
  alVerInforme: (sesionId: string) => void;
}

export default function Conversacion({
  alSalir,
  alVerHistorial,
  alVerPerfil,
  alVerCarreras,
  alVerInforme,
}: Propiedades) {
  const {
    sesionId,
    turnos,
    enCurso,
    cargando,
    enviando,
    error,
    fuentes,
    intercambios,
    estado,
    tieneInforme,
    enviar,
    reintentar,
  } = useConversacion();
  const [borrador, setBorrador] = useState("");
  const [encuadre, setEncuadre] = useState<string | null>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const botonInforme = useRef<HTMLButtonElement>(null);
  const finDeLista = useRef<HTMLLIElement>(null);

  // El foco vuelve al campo cuando termina el envío. Sin esto, quien escribe
  // con teclado queda sin punto de partida después de cada respuesta y tiene
  // que tabular desde el principio de la página. Si esa respuesta cerró la
  // conversación, va al informe: devolverlo al campo lo deja escribiendo en
  // una charla que terminó sin enterarse.
  useEffect(() => {
    if (enviando) return;
    (estado === "cerrada" ? botonInforme : campo).current?.focus();
  }, [enviando, estado]);

  useEffect(() => {
    finDeLista.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turnos, enCurso]);

  async function mandar() {
    const texto = borrador;
    setBorrador("");
    await enviar(texto);
  }

  const vacia = turnos.length === 0 && enCurso === null;
  // Escalada: la sesión se cortó por una señal de riesgo. No se le ofrece el
  // informe ni se le muestran fuentes a alguien a quien se acaba de contener.
  const derivada = estado === "derivada";

  // La sesión nace con el primer mensaje, y con ella su saludo: sin esto el
  // saludo aparecía después de lo que la persona ya había escrito. Se muestra
  // el mismo texto antes, y al primer envío lo reemplaza el turno guardado. Si
  // no llega, queda la invitación de siempre: no es motivo para un error.
  const sinEncuadre = encuadre === null;
  useEffect(() => {
    if (!vacia || cargando || !sinEncuadre) return;
    obtenerEncuadre().then(
      (recibido) => setEncuadre(recibido.texto),
      () => undefined,
    );
  }, [vacia, cargando, sinEncuadre]);

  return (
    <div className="flex h-full flex-col gap-4">
      {/* `flex-wrap` en las dos filas: a 360 px el titulo mas los dos
          botones no entran en una linea, y sin envolver la pagina scrollea
          en horizontal. La franja de divulgacion de `App` ya envuelve por lo
          mismo. */}
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-xl font-semibold">Tu conversación</h1>
        <div className="flex flex-wrap items-center gap-3">
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
          {/* La puerta al historial (HU-12). Va acá y no como pantalla de
              entrada: quien está conversando tiene que poder buscar una charla
              anterior, pero recargar en medio de esta tiene que devolver a
              esta. */}
          <button
            type="button"
            onClick={alVerHistorial}
            className="border-input hover:bg-primary-soft inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm"
          >
            Tus conversaciones
          </button>
          {/* El perfil es el otro desvío (HU-13). Va al lado del historial y
              no como pestaña: los dos se leen desde la conversación y se
              vuelve a ella, que es lo que HU-07 pide al recargar. */}
          <button
            type="button"
            onClick={alVerPerfil}
            className="border-input hover:bg-primary-soft inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm"
          >
            Tu perfil
          </button>
          {/* Una sesión reabierta sigue teniendo el informe de su cierre
              anterior; recién cerrada, el acceso es el aviso de abajo. */}
          {tieneInforme && estado !== "cerrada" && !derivada && (
            <button
              type="button"
              onClick={() => alVerInforme(sesionId)}
              className="border-input hover:bg-primary-soft inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm"
            >
              Tu informe
            </button>
          )}
          {/* Otro desvío del mismo tipo: se consulta el corpus de carreras
              directo y se vuelve a la charla (HU-15). */}
          <button
            type="button"
            onClick={alVerCarreras}
            className="border-input hover:bg-primary-soft inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm"
          >
            Carreras
          </button>
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

        {!cargando && vacia && encuadre !== null && <Burbuja rol="agente" texto={encuadre} />}

        {!cargando && vacia && encuadre === null && (
          <li className="text-muted-foreground text-sm">
            Contame por dónde andás: qué estás cursando o terminando, y qué te trajo hasta acá. No
            hace falta que tengas una respuesta armada.
          </li>
        )}

        {turnos.map((turno) => (
          <Burbuja
            key={turno.numero}
            rol={turno.rol}
            texto={turno.contenido}
            traza={turno.rol === "agente" ? { sesionId, turno: turno.numero } : undefined}
          />
        ))}

        {enCurso !== null && (
          <>
            <Burbuja rol="usuario" texto={enCurso.usuario} />
            <Burbuja rol="agente" texto={enCurso.agente} escribiendo={enCurso.agente === ""} />
          </>
        )}

        <li aria-hidden="true" ref={finDeLista} />
      </ol>

      {fuentes.length > 0 && !enviando && !derivada && <Fuentes fuentes={fuentes} />}

      {/* La región viva existe siempre y lo que cambia es su contenido: una
          que aparece ya llena no se anuncia en todos los lectores. Sin el
          anuncio, quien no ve la pantalla no se entera de que terminó.

          No dice «listo»: el informe se arma después de la última respuesta
          y puede tardar unos segundos; la pantalla del informe lo espera.

          El campo de abajo no se deshabilita: seguir escribiendo reabre la
          sesión del otro lado sin perder lo que ya contó, y el informe del
          cierre se sigue pudiendo leer desde la cabecera. */}
      <div role="status">
        {/* Sin «Ver tu informe»: la charla se cortó por lo que contó, no porque
            se completara, y ofrecerle un resultado ahí es no haberla escuchado.
            Las líneas dependen de la señal y ya están en la respuesta; el 911
            vale para todas. */}
        {derivada && !enviando && (
          <div className="bg-accent-soft text-accent-foreground flex flex-col gap-1 rounded-md p-3 text-sm">
            <p>
              Dejamos la charla sobre carreras acá. Lo que importa ahora es que hables con alguien:
              los teléfonos están en la última respuesta, y si estás en peligro ahora mismo, llamá
              al <a href="tel:911">911</a>.
            </p>
            <p>Si más adelante querés retomar, podés volver a escribir acá.</p>
          </div>
        )}
        {estado === "cerrada" && !enviando && (
          <div className="bg-primary-soft flex flex-wrap items-center justify-between gap-3 rounded-md p-3 text-sm">
            <p>
              Terminó esta parte de la charla y tu informe ya está. Si querés, podés seguir
              escribiendo.
            </p>
            <button
              ref={botonInforme}
              type="button"
              onClick={() => alVerInforme(sesionId)}
              className="bg-primary text-primary-foreground inline-flex min-h-11 items-center justify-center rounded-md px-4 font-medium"
            >
              Ver tu informe
            </button>
          </div>
        )}
      </div>

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

function Fuentes({ fuentes }: { fuentes: Fuente[] }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <>
      {/* Una línea y no un recuadro: en la prueba del piloto el recuadro cargaba
          el chat. La salvedad de R-002 va en la línea misma y no en la ventana:
          una salvedad que hay que abrir para leer no es una salvedad. */}
      <p className="text-muted-foreground text-sm">
        <button
          type="button"
          onClick={() => setAbierta(true)}
          className="text-primary underline underline-offset-2"
        >
          Fuentes de la Facultad ({fuentes.length})
        </button>{" "}
        · datos <strong>provisionales</strong>, todavía sin validar.
      </p>
      <Ventana titulo="Fuentes consultadas" abierta={abierta} alCerrar={() => setAbierta(false)}>
        {/* «Consultadas» y no «citadas»: el backend recupera lo más cercano a
            lo que se escribió y el modelo puede haber ignorado todo. */}
        <p className="text-muted-foreground">
          Material de la Facultad que VocaIA consultó para armar la última respuesta. No
          necesariamente lo citó. Son datos provisionales, todavía sin validar.
        </p>
        <ul className="mt-2 flex flex-col gap-1">
          {fuentes.map((fuente) => (
            <li key={fuente.id}>
              <Referencia texto={fuente.fuente} />
            </li>
          ))}
        </ul>
      </Ventana>
    </>
  );
}

/**
 * Una ventana sobre la conversación, con el `<dialog>` del navegador: trae el
 * foco atrapado, Escape para cerrar y el fondo inerte sin código propio.
 */
function Ventana({
  titulo,
  abierta,
  alCerrar,
  children,
}: {
  titulo: string;
  abierta: boolean;
  alCerrar: () => void;
  children: ReactNode;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const actual = dialogo.current;
    if (actual === null) return;
    // ponytail: jsdom no implementa showModal; ahí alcanza con el atributo.
    if (abierta && !actual.open) {
      if (typeof actual.showModal === "function") actual.showModal();
      else actual.setAttribute("open", "");
    }
    if (!abierta && actual.open) {
      if (typeof actual.close === "function") actual.close();
      else actual.removeAttribute("open");
    }
  }, [abierta]);
  return (
    <dialog
      ref={dialogo}
      aria-label={titulo}
      onClose={alCerrar}
      className="bg-surface text-foreground border-border backdrop:bg-foreground/40 m-auto max-h-[80vh] w-[min(36rem,calc(100%-2rem))] overflow-y-auto rounded-xl border p-4 text-sm"
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">{titulo}</h2>
        <button
          type="button"
          onClick={alCerrar}
          className="border-input hover:bg-primary-soft inline-flex min-h-11 items-center rounded-md border px-3"
        >
          Cerrar
        </button>
      </div>
      {abierta && children}
    </dialog>
  );
}

interface PropiedadesBurbuja {
  rol: string;
  texto: string;
  escribiendo?: boolean;
  /** Sólo en respuestas confirmadas: la que se está escribiendo no tiene número todavía. */
  traza?: { sesionId: string; turno: number };
}

function Burbuja({ rol, texto, escribiendo = false, traza }: PropiedadesBurbuja) {
  const esPersona = rol === "usuario";
  // La traza se pide al abrir y no al dibujar: una conversación larga haría un
  // pedido por respuesta para algo que casi nadie despliega.
  const [abierta, setAbierta] = useState(false);
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
        ) : esPersona ? (
          <p className="whitespace-pre-wrap">{texto}</p>
        ) : (
          <Prosa texto={texto} />
        )}
        {/* Un ícono y no una línea de texto bajo cada respuesta: repetida en
            todas, cargaba el chat (prueba del piloto). El nombre accesible es
            la pregunta entera, y `title` se la muestra a quien pasa el mouse. */}
        {traza !== undefined && (
          <div className="mt-1 flex justify-end">
            <button
              type="button"
              onClick={() => setAbierta(true)}
              aria-label="¿De dónde salió esto?"
              title="¿De dónde salió esto?"
              className="text-muted-foreground hover:text-primary inline-flex size-8 items-center justify-center rounded-full"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M12 11v6M12 7.5v.5" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
            <Ventana
              titulo="¿De dónde salió esto?"
              abierta={abierta}
              alCerrar={() => setAbierta(false)}
            >
              <Trazabilidad sesionId={traza.sesionId} turno={traza.turno} />
            </Ventana>
          </div>
        )}
      </div>
    </li>
  );
}
