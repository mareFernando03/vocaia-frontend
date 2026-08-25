import { afterEach, describe, expect, it, vi } from "vitest";

import { SesionVencida } from "./cliente";
import { enviarMensaje, type EventoConversacion } from "./conversacion";

/**
 * El lector de eventos es la parte que se puede romper en silencio: los trozos
 * en los que llega el cuerpo no coinciden con los eventos, y el corte cae donde
 * cae. Por eso las pruebas parten el flujo por posiciones de byte arbitrarias y
 * no por evento.
 */

const CLAVE_TOKEN = "vocaia.token_identidad";

/** Un cuerpo SSE partido en trozos de `tamano` bytes, como llegaría por red. */
function cuerpoPartido(texto: string, tamano: number): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(texto);
  let posicion = 0;
  return new ReadableStream<Uint8Array>({
    pull(controlador) {
      if (posicion >= bytes.length) {
        controlador.close();
        return;
      }
      controlador.enqueue(bytes.slice(posicion, posicion + tamano));
      posicion += tamano;
    },
  });
}

function responderCon(cuerpo: ReadableStream<Uint8Array> | null, estado = 200): void {
  // `stubGlobal` y no una asignación directa: es lo que `unstubAllGlobals`
  // deshace después de cada prueba, para que el `fetch` falso no se filtre.
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(cuerpo, { status: estado })));
}

async function juntar(sesionId = "s-1", texto = "hola"): Promise<EventoConversacion[]> {
  const eventos: EventoConversacion[] = [];
  for await (const evento of enviarMensaje(sesionId, texto)) eventos.push(evento);
  return eventos;
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
});

describe("enviarMensaje · lectura del flujo de eventos", () => {
  const flujo =
    'data: {"delta": "Contame más"}\n\n' +
    'data: {"delta": " sobre eso."}\n\n' +
    'data: {"fin": true, "turno_usuario": 1, "turno_agente": 2}\n\n';

  // Tres bytes por trozo parte los eventos por el medio y, además, corta la "á"
  // de "más" entre dos lecturas: es el caso que sin `decode(..., {stream:true})`
  // sale con un rombo en vez de la letra.
  it.each([3, 7, 64, 4096])("reconstruye los eventos con trozos de %i bytes", async (tamano) => {
    responderCon(cuerpoPartido(flujo, tamano));

    expect(await juntar()).toEqual([
      { delta: "Contame más" },
      { delta: " sobre eso." },
      { fin: true, turno_usuario: 1, turno_agente: 2 },
    ]);
  });

  it("un bloque ilegible no tira abajo los que vienen después", async () => {
    responderCon(cuerpoPartido('data: {no es json}\n\ndata: {"delta": "sigo acá"}\n\n', 11));

    expect(await juntar()).toEqual([{ delta: "sigo acá" }]);
  });

  it("con 401 descarta la sesión, como hace el resto del cliente", async () => {
    window.sessionStorage.setItem(CLAVE_TOKEN, "token-vencido");
    responderCon(null, 401);

    await expect(juntar()).rejects.toBeInstanceOf(SesionVencida);
    expect(window.sessionStorage.getItem(CLAVE_TOKEN)).toBeNull();
  });

  // Sin `cancel` en el `finally`, el cuerpo queda sin leer y la conexión abierta:
  // `releaseLock` sola suelta el lector pero no cierra nada. No se ve hasta que
  // alguien corta el bucle antes de tiempo, que es lo que hace esta prueba.
  it("cortar el bucle antes de tiempo cierra el cuerpo", async () => {
    let cancelado = false;
    responderCon(
      new ReadableStream<Uint8Array>({
        pull(controlador) {
          controlador.enqueue(new TextEncoder().encode('data: {"delta": "y"}\n\n'));
        },
        cancel() {
          cancelado = true;
        },
      }),
    );

    for await (const evento of enviarMensaje("s-1", "hola")) {
      expect(evento).toEqual({ delta: "y" });
      break;
    }

    expect(cancelado).toBe(true);
  });
});
