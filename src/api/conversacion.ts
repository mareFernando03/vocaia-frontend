/**
 * Circuito conversacional: mandar un mensaje y leer el historial (HU-07).
 *
 * Los tipos de las respuestas salen de `generado/esquema.ts`, que produce
 * `npm run generar-cliente` desde el `openapi.json` del backend. Acá no se
 * define a mano el tipo de ninguna respuesta, como pide ADR-008 §3.
 *
 * La única excepción es la forma de los eventos del streaming, y no por
 * comodidad: `POST .../mensaje` responde `text/event-stream`, que en OpenAPI
 * solo se puede describir como una cadena. El esquema documenta los tres
 * eventos en prosa y no hay nada tipado que generar de ahí. Se declaran abajo,
 * pegados al lector que los consume, para que el día que el backend agregue un
 * evento el desajuste aparezca en un solo lugar.
 */

import { borrarToken, obtenerToken } from "../auth/sesion";
import { BASE, ErrorDeApi, leerDetalle, pedir, SesionVencida } from "./cliente";
import type { components } from "./generado/esquema";

export type Historial = components["schemas"]["HistorialSalida"];
export type Turno = components["schemas"]["TurnoSalida"];
export type ResumenSesion = components["schemas"]["ResumenSesionSalida"];

/**
 * Las sesiones de quien consulta, de la más reciente a la más vieja (HU-12).
 *
 * No lleva a quién pertenecen: el backend lo saca de la credencial y no de la
 * petición, así que no hay forma de pedir el historial de otra persona.
 */
export function listarSesiones(): Promise<ResumenSesion[]> {
  return pedir<ResumenSesion[]>("/api/conversacion");
}

/**
 * El historial de la sesión, o `null` si el backend todavía no la conoce.
 *
 * El 404 no es un fallo: no hay endpoint de alta, la sesión nace con el primer
 * mensaje. Un identificador guardado que nunca se usó no existe del otro lado,
 * y eso es exactamente una conversación vacía.
 */
export async function obtenerHistorial(sesionId: string): Promise<Historial | null> {
  try {
    return await pedir<Historial>(`/api/conversacion/${sesionId}`);
  } catch (error) {
    if (error instanceof ErrorDeApi && error.estado === 404) return null;
    throw error;
  }
}

/** Un trozo más de la respuesta que se está escribiendo. */
interface EventoDelta {
  delta: string;
}

/**
 * Un fragmento del corpus institucional que el backend consultó para el turno.
 *
 * `fuente` es la denominación de la fuente seguida de su ubicación, tal como la
 * arma el backend: «Ordenanza C.S. N.º 1877 — http://…».
 */
export interface Fuente {
  id: string;
  fuente: string;
}

/**
 * El turno se cerró. Los números los asigna el backend, no el cliente.
 *
 * `fuentes` son las que se **consultaron**, no necesariamente las que la
 * respuesta cita: el backend recupera los fragmentos más cercanos a lo que la
 * persona escribió y el modelo tiene instrucción de ignorar los que no vengan
 * al caso. Mostrarlas como «citadas» le atribuiría a la respuesta un respaldo
 * que puede no tener.
 */
interface EventoFin {
  fin: true;
  turno_usuario: number;
  turno_agente: number;
  /**
   * Opcional a propósito, aunque el backend siempre la emita: esta forma se
   * declara a mano y no sale del `openapi.json`, así que el compilador no
   * tiene cómo saber contra qué versión del backend corre. Es lo que hace que
   * el `?? []` de quien la lee sea una rama de verdad y no código muerto.
   */
  fuentes?: Fuente[];
}

/** La generación se cortó a mitad de camino. */
interface EventoError {
  error: string;
}

export type EventoConversacion = EventoDelta | EventoFin | EventoError;

/**
 * Manda un mensaje y devuelve los eventos a medida que llegan.
 *
 * No se puede usar `EventSource`: solo hace GET y no deja mandar cabeceras, y
 * acá hacen falta las dos cosas. Con `fetch` hay que leer el cuerpo a mano,
 * que es lo que hace el bucle de abajo.
 *
 * El tratamiento del 401 es el mismo que el de `pedir` —descartar la sesión—
 * porque una credencial vencida no es distinta por llegar en este camino. Está
 * repetido y no reusado porque `pedir` consume el cuerpo como JSON: llamarlo
 * acá se comería el stream.
 */
export async function* enviarMensaje(
  sesionId: string,
  contenido: string,
): AsyncGenerator<EventoConversacion> {
  const token = obtenerToken();
  const cabeceras = new Headers({ "Content-Type": "application/json" });
  if (token) cabeceras.set("Authorization", `Bearer ${token}`);

  const respuesta = await fetch(`${BASE}/api/conversacion/${sesionId}/mensaje`, {
    method: "POST",
    headers: cabeceras,
    body: JSON.stringify({ contenido }),
  });

  if (respuesta.status === 401) {
    borrarToken();
    throw new SesionVencida();
  }
  if (!respuesta.ok) {
    throw new ErrorDeApi(respuesta.status, await leerDetalle(respuesta));
  }
  if (respuesta.body === null) {
    throw new ErrorDeApi(respuesta.status, "El servidor no devolvió un cuerpo que leer.");
  }

  const lector = respuesta.body.getReader();
  const decodificador = new TextDecoder();
  let pendiente = "";

  try {
    for (;;) {
      const { done, value } = await lector.read();
      if (done) break;
      // `stream: true` para no romper un carácter multibyte partido entre dos
      // trozos: sin esto, un acento a caballo de dos lecturas sale como "".
      pendiente += decodificador.decode(value, { stream: true });

      let corte = pendiente.indexOf("\n\n");
      while (corte !== -1) {
        const bloque = pendiente.slice(0, corte);
        pendiente = pendiente.slice(corte + 2);
        const evento = interpretar(bloque);
        if (evento !== null) yield evento;
        corte = pendiente.indexOf("\n\n");
      }
    }
  } finally {
    // Si quien consume corta el bucle antes de tiempo, `releaseLock` sola deja
    // el cuerpo sin leer y la conexión abierta: lo que la cierra es `cancel`.
    // Sobre un flujo que ya terminó no hace nada.
    await lector.cancel();
  }
}

/** Un bloque SSE es una o más líneas; la que importa es la que arranca con `data:`. */
function interpretar(bloque: string): EventoConversacion | null {
  const linea = bloque.split("\n").find((l) => l.startsWith("data:"));
  if (linea === undefined) return null;
  try {
    return JSON.parse(linea.slice("data:".length).trim()) as EventoConversacion;
  } catch {
    // Un bloque ilegible no justifica tirar abajo la conversación entera: lo
    // que ya se mostró sigue siendo válido y el próximo evento puede llegar
    // bien.
    return null;
  }
}
