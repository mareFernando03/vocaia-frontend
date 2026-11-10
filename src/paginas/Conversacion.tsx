/**
 * Pantalla de conversación (HU-06 del lado del cliente, HU-07).
 *
 * Es deliberadamente sobria: la atención tiene que estar en lo que se está
 * contando, no en la interfaz. Todo el color sale de los tokens del sistema de
 * diseño; no hay un solo literal, que es lo que verifica
 * `npm run verificar-contraste`.
 *
 * El campo para escribir queda fijo abajo mientras la charla corre por detrás,
 * como en cualquier aplicación de mensajes (sistema de diseño §7). Es la página
 * la que se desplaza y no una caja interna: así el teclado del teléfono empuja
 * el campo hacia arriba sin que nada quede atrapado detrás.
 */

import { ArrowUp, BookOpenText, FileText, HeartHandshake, Phone } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { obtenerEncuadre, type Fuente } from "../api/conversacion";
import { Prosa } from "../componentes/Prosa";
import { Referencia } from "../componentes/Referencia";
import { Trazabilidad } from "../componentes/Trazabilidad";
import { Aviso } from "../componentes/ui/Aviso";
import { Boton } from "../componentes/ui/Boton";
import { BotonIcono } from "../componentes/ui/BotonIcono";
import { Cargando } from "../componentes/ui/Cargando";
import { Dialogo } from "../componentes/ui/Dialogo";
import { ErrorConReintento } from "../componentes/ui/ErrorConReintento";
import { InfoTip } from "../componentes/ui/InfoTip";
import { useConversacion } from "../hooks/useConversacion";
import { cn } from "../lib/cn";

interface Propiedades {
  alVerInforme: (sesionId: string) => void;
}

/** Hasta dónde crece el campo antes de pasar a tener su propio scroll. */
const ALTO_MAXIMO_CAMPO = 160;

export default function Conversacion({ alVerInforme }: Propiedades) {
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
    terminar,
    reintentar,
    errorAlTerminar,
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

  // Un `behavior: "smooth"` escrito en el código no lo frena la regla de CSS de
  // menos movimiento: hay que preguntarle al sistema acá también.
  useEffect(() => {
    const quieto = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    finDeLista.current?.scrollIntoView({ block: "end", behavior: quieto ? "auto" : "smooth" });
  }, [turnos, enCurso]);

  // El campo crece con lo que se escribe, hasta un tope. Un campo de dos líneas
  // fijas obliga a escribir a ciegas un mensaje largo, y uno que crece sin
  // tope tapa la conversación.
  useLayoutEffect(() => {
    const actual = campo.current;
    if (actual === null) return;
    actual.style.height = "auto";
    actual.style.height = `${Math.min(actual.scrollHeight, ALTO_MAXIMO_CAMPO)}px`;
  }, [borrador]);

  async function terminarYVer() {
    if (await terminar()) alVerInforme(sesionId);
  }

  async function mandar() {
    const texto = borrador;
    if (texto.trim() === "") return;
    setBorrador("");
    await enviar(texto);
  }

  const vacia = turnos.length === 0 && enCurso === null;
  // El saludo se ve mientras no haya turnos guardados, también mientras se
  // contesta el primer mensaje: con `vacia` desaparecía al enviar y volvía
  // arriba al terminar (revisión del #38).
  const sinTurnos = turnos.length === 0;
  // Escalada: la sesión se cortó por una señal de riesgo. No se le ofrece el
  // informe ni se le muestran fuentes a alguien a quien se acaba de contener.
  const derivada = estado === "derivada";

  // La sesión nace con el primer mensaje, y con ella su saludo: sin esto el
  // saludo aparecía después de lo que la persona ya había escrito. Se muestra
  // el mismo texto antes, y al primer envío lo reemplaza el turno guardado. Si
  // no llega, queda la invitación de siempre: no es motivo para un error.
  const sinEncuadre = encuadre === null;
  useEffect(() => {
    if (!sinTurnos || cargando || !sinEncuadre) return;
    obtenerEncuadre().then(
      (recibido) => setEncuadre(recibido.texto),
      () => undefined,
    );
  }, [sinTurnos, cargando, sinEncuadre]);

  // Una sesión reabierta sigue teniendo el informe de su cierre anterior;
  // recién cerrada, el acceso es el aviso de abajo.
  const ofreceInforme = tieneInforme && estado !== "cerrada" && !derivada;
  // Para quien quiere cortar antes del final: el perfil y el informe se arman
  // al cierre, y sin esto se iba con nada (H24). No cierra para siempre: seguir
  // escribiendo abre la parte siguiente.
  const ofreceTerminar = intercambios > 0 && estado === "abierta" && !enviando;

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* El título no se ve: la pantalla ya dice lo que es. Está para que quien
          usa lector de pantalla sepa dónde quedó parado. */}
      <div className="flex min-h-11 flex-wrap items-center justify-end gap-2">
        <h1 className="sr-only">Tu conversación</h1>
        {ofreceInforme && (
          <Boton variante="secundario" onClick={() => alVerInforme(sesionId)}>
            <FileText aria-hidden="true" />
            Tu informe
          </Boton>
        )}
        {ofreceTerminar && (
          <Boton variante="fantasma" onClick={() => void terminarYVer()}>
            Terminar acá y ver mi informe
          </Boton>
        )}
      </div>

      {/* `aria-live` va acá y no en cada burbuja: lo que tiene que anunciarse
          es la respuesta a medida que se escribe. `polite` y no `assertive`
          para no interrumpir a quien todavía está leyendo lo anterior. */}
      <ol aria-live="polite" aria-busy={enviando} className="flex flex-1 flex-col gap-3">
        {cargando && (
          <li>
            <Cargando texto="Recuperando la conversación…" />
          </li>
        )}

        {!cargando && sinTurnos && encuadre !== null && <Burbuja rol="agente" texto={encuadre} />}

        {!cargando && vacia && encuadre === null && (
          <Burbuja
            rol="agente"
            texto="Contame por dónde andás: qué estás cursando o terminando, y qué te trajo hasta acá. No hace falta que tengas una respuesta armada."
          />
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

        {/* El margen hace que, al bajar hasta acá, el último mensaje quede por
            encima del campo fijo y no detrás. */}
        <li aria-hidden="true" ref={finDeLista} className="scroll-mb-48" />
      </ol>

      {/* La parte de abajo queda pegada al borde mientras la charla se
          desplaza: lo que se acaba de decir, si terminó, y el campo. Encima de
          la barra de pestañas en el teléfono, que se esconde al escribir. */}
      <div
        className={cn(
          "bg-background/95 sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] -mx-4 flex flex-col gap-3 px-4 pt-2 pb-3 backdrop-blur sm:bottom-0 sm:-mx-6 sm:px-6 sm:pb-4",
          // Con el teclado abierto la barra de abajo desaparece y el campo baja
          // a ocupar su lugar. Es la misma marca que esconde la barra en
          // `Navegacion` (`useTecladoVirtual`).
          "[[data-teclado]_&]:bottom-0",
        )}
      >
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
          {/* Sin «Ver tu informe»: la charla se cortó por lo que contó, no
              porque se completara, y ofrecerle un resultado ahí es no haberla
              escuchado. Las líneas dependen de la señal y ya están en la
              respuesta; el 911 vale para todas. */}
          {derivada && !enviando && (
            <Aviso tono="apoyo" icono={<HeartHandshake />}>
              <p>
                Dejamos la charla sobre carreras acá. Lo que importa ahora es que hables con
                alguien: los teléfonos están en la última respuesta, y si estás en peligro ahora
                mismo, llamá al{" "}
                {/* El preflight de Tailwind le saca color y subrayado a un
                    enlace: sin clases no se veía como tal, y es el único dato de
                    seguridad que garantiza la pantalla. */}
                <a
                  href="tel:911"
                  className="bg-support text-support-foreground mx-0.5 inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 align-middle font-semibold"
                >
                  <Phone aria-hidden="true" className="size-4" />
                  911
                </a>
                .
              </p>
              <p>Si más adelante querés retomar, podés volver a escribir acá.</p>
            </Aviso>
          )}
          {estado === "cerrada" && !enviando && (
            <Aviso tono="info" className="items-center">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p>Terminó esta parte de la charla. Podés ver tu informe o seguir escribiendo.</p>
                <Boton
                  ref={botonInforme}
                  variante="primario"
                  onClick={() => alVerInforme(sesionId)}
                >
                  <FileText aria-hidden="true" />
                  Ver tu informe
                </Boton>
              </div>
            </Aviso>
          )}
        </div>

        {error !== null && (
          <ErrorConReintento
            alReintentar={() => (errorAlTerminar ? void terminarYVer() : reintentar())}
          >
            {error}
          </ErrorConReintento>
        )}

        <form
          className="border-input bg-surface shadow-tarjeta focus-within:border-ring focus-within:outline-ring flex items-end gap-2 rounded-2xl border p-1.5 ps-4 transition-colors focus-within:outline-1"
          onSubmit={(evento) => {
            evento.preventDefault();
            void mandar();
          }}
        >
          <label htmlFor="mensaje" className="sr-only">
            Escribí tu mensaje
          </label>
          {/* El anillo de foco lo dibuja el recuadro entero (`focus-within`):
              el campo no tiene borde propio, y un anillo pegado al texto se ve
              cortado. */}
          <textarea
            id="mensaje"
            ref={campo}
            rows={1}
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
            className="placeholder:text-muted-foreground min-h-11 flex-1 resize-none bg-transparent py-2.5 text-base leading-relaxed outline-none focus-visible:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={enviando || borrador.trim() === ""}
            className="bg-primary text-primary-foreground hover:bg-primary-light inline-flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUp aria-hidden="true" className="size-5" strokeWidth={2.5} />
            <span className="sr-only">Enviar</span>
          </button>
        </form>
      </div>
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
      <p className="text-muted-foreground flex flex-wrap items-center gap-x-1 text-sm">
        <Dialogo
          titulo="Fuentes consultadas"
          abierto={abierta}
          alCambiar={setAbierta}
          disparador={
            <button
              type="button"
              className="text-primary inline-flex min-h-11 items-center gap-1.5 underline underline-offset-4"
            >
              <BookOpenText aria-hidden="true" className="size-4" />
              Fuentes de la Facultad ({fuentes.length})
            </button>
          }
        >
          <ContenidoFuentes fuentes={fuentes} />
        </Dialogo>
        <span>
          · datos <strong className="text-foreground font-semibold">provisionales</strong>, todavía
          sin validar.
        </span>
      </p>
    </>
  );
}

function ContenidoFuentes({ fuentes }: { fuentes: Fuente[] }) {
  return (
    <>
      {/* «Consultadas» y no «citadas»: el backend recupera lo más cercano a
            lo que se escribió y el modelo puede haber ignorado todo. */}
      <p className="text-muted-foreground flex items-center gap-1">
        Lo que VocaIA leyó para la última respuesta.
        <InfoTip tema="estas fuentes">
          Es el material de la Facultad más cercano a lo que escribiste. La respuesta no
          necesariamente lo usó todo.
        </InfoTip>
      </p>
      {/* La salvedad ya está en la línea que abre esta ventana; repetirla
            acá como insignia sólo sumaba ruido. */}
      <ul className="mt-4 flex flex-col gap-2">
        {fuentes.map((fuente) => (
          <li key={fuente.id}>
            <Referencia texto={fuente.fuente} />
          </li>
        ))}
      </ul>
    </>
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
    <li
      className={cn(
        "animate-aparecer flex items-end gap-1",
        esPersona ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[88%] px-4 py-2.5 text-[0.9375rem] leading-relaxed sm:max-w-[80%] sm:text-base",
          esPersona
            ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
            : "bg-surface border-border shadow-tarjeta rounded-2xl rounded-bl-md border",
        )}
      >
        {/* El rol se nombra para quien no ve la alineación ni el color: sin
            esto, un lector de pantalla lee dos textos seguidos sin saber quién
            dijo cada cosa. */}
        <span className="sr-only">{esPersona ? "Vos:" : "VocaIA:"}</span>
        {escribiendo ? (
          <Cargando texto="Escribiendo…" />
        ) : esPersona ? (
          <p className="whitespace-pre-wrap">{texto}</p>
        ) : (
          <Prosa texto={texto} />
        )}
      </div>
      {/* Un ícono al costado y no una línea de texto bajo cada respuesta:
          repetida en todas, cargaba el chat (prueba del piloto). El nombre
          accesible es la pregunta entera, y aparece como etiqueta al pasar el
          mouse o llegar con el teclado. */}
      {traza !== undefined && (
        <>
          <Dialogo
            titulo="¿De dónde salió esto?"
            abierto={abierta}
            alCambiar={setAbierta}
            disparador={
              <BotonIcono etiqueta="¿De dónde salió esto?">
                <BookOpenText aria-hidden="true" />
              </BotonIcono>
            }
          >
            <Trazabilidad sesionId={traza.sesionId} turno={traza.turno} />
          </Dialogo>
        </>
      )}
    </li>
  );
}
