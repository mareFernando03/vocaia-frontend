import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Notificacion } from "../api/notificacion";
import { borrarToken, guardarToken } from "../auth/sesion";
import { NOTIFICACION } from "../contenido/aviso-notificacion";
import { hayQuePreguntar } from "../hooks/useAvisoPreguntado";
import PreguntaAviso, { TOPE_CONSULTA_MS } from "./PreguntaAviso";

/**
 * S7-12 (VOCAIA-204) · la autorización del aviso se pregunta antes de chatear.
 *
 * Se falsea `fetch`, como en la sección del perfil, para pasar por el cliente real.
 */

const NUNCA: Notificacion = { vigente: false, hay_contacto: true };
const OTORGADO: Notificacion = {
  vigente: true,
  hay_contacto: true,
  version: NOTIFICACION.version,
  otorgado_en: "2026-11-05T12:00:00Z",
};
const REVOCADO: Notificacion = { ...OTORGADO, vigente: false, revocado_en: "2026-11-05T13:00:00Z" };

type Respuesta = Notificacion | "sin red" | "colgado" | { estado: number; detail: string };

/** Cada ruta responde una vez cada valor de la lista, y el último se repite. */
function responder(rutas: Record<string, Respuesta | Respuesta[]>) {
  const pendientes = new Map(
    Object.entries(rutas).map(([clave, valor]) => [
      clave,
      Array.isArray(valor) ? [...valor] : [valor],
    ]),
  );
  const espia = vi.fn(async (url: string, init?: RequestInit) => {
    const clave = `${init?.method ?? "GET"} ${new URL(url).pathname}`;
    const lista = pendientes.get(clave);
    if (lista === undefined) throw new Error(`Pedido inesperado: ${clave}`);
    const respuesta = lista.length > 1 ? lista.shift()! : lista[0];
    if (respuesta === "sin red") throw new TypeError("Failed to fetch");
    if (respuesta === "colgado") {
      // No responde nunca: sólo termina si se aborta, como un fetch real.
      return new Promise<Response>((_, rechazar) =>
        init?.signal?.addEventListener("abort", () =>
          rechazar(new DOMException("The operation was aborted.", "AbortError")),
        ),
      );
    }
    if ("estado" in respuesta) {
      return Response.json({ detail: respuesta.detail }, { status: respuesta.estado });
    }
    return Response.json(respuesta);
  });
  vi.stubGlobal("fetch", espia);
  return espia;
}

describe("hayQuePreguntar", () => {
  it.each([
    ["nunca lo decidió", NUNCA, true],
    ["lo autorizó con un texto anterior", { ...OTORGADO, version: "notificacion-v1" }, true],
    ["ya lo tiene autorizado", OTORGADO, false],
    ["lo dejó de autorizar a propósito", REVOCADO, false],
    ["no comparte un correo, así que no podría", { ...NUNCA, hay_contacto: false }, false],
  ])("%s → %s", (_, estado, esperado) => {
    expect(hayQuePreguntar(estado)).toBe(esperado);
  });
});

describe("PreguntaAviso (S7-12)", () => {
  beforeEach(() => guardarToken("token-de-prueba"));
  afterEach(() => {
    vi.unstubAllGlobals();
    borrarToken();
  });

  it("a quien nunca lo decidió le pregunta, y se puede seguir sin autorizar", async () => {
    responder({ "GET /api/identidad/notificacion": NUNCA });
    const alSeguir = vi.fn();
    render(<PreguntaAviso alSeguir={alSeguir} alFallarLaConsulta={() => {}} />);

    const titulo = await screen.findByRole("heading", { name: NOTIFICACION.antesDeEmpezar });
    // El foco va a la pregunta: si no, un lector de pantalla no se entera. Lo
    // pone un efecto después de dibujarla, así que se espera.
    await waitFor(() => expect(titulo).toHaveFocus());
    expect(await screen.findByRole("button", { name: NOTIFICACION.otorgar })).toBeInTheDocument();
    expect(alSeguir).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: NOTIFICACION.seguir }));

    expect(alSeguir).toHaveBeenCalledTimes(1);
  });

  it("autorizar desde la pregunta registra la misma versión que el perfil", async () => {
    const espia = responder({
      "GET /api/identidad/notificacion": NUNCA,
      "POST /api/identidad/notificacion": OTORGADO,
    });
    render(<PreguntaAviso alSeguir={() => {}} alFallarLaConsulta={() => {}} />);

    await userEvent.click(await screen.findByRole("button", { name: NOTIFICACION.otorgar }));

    expect(await screen.findByText(/Lo autorizaste el 5 de noviembre de 2026/)).toBeInTheDocument();
    const otorgamiento = espia.mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(String(otorgamiento?.[1]?.body))).toEqual({ version: NOTIFICACION.version });
  });

  it.each([
    ["ya lo tiene autorizado", OTORGADO],
    ["lo dejó de autorizar", REVOCADO],
  ] as const)("si %s, sigue sola a la conversación", async (_, estado) => {
    responder({ "GET /api/identidad/notificacion": estado });
    const alSeguir = vi.fn();
    render(<PreguntaAviso alSeguir={alSeguir} alFallarLaConsulta={() => {}} />);

    await waitFor(() => expect(alSeguir).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("heading", { name: NOTIFICACION.antesDeEmpezar })).toBeNull();
  });

  it("sin red, lo dice y deja seguir sin darla por hecha", async () => {
    responder({ "GET /api/identidad/notificacion": "sin red" });
    const alSeguir = vi.fn();
    const alFallar = vi.fn();
    render(<PreguntaAviso alSeguir={alSeguir} alFallarLaConsulta={alFallar} />);

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent(NOTIFICACION.consultaFallida);
    expect(alerta).toHaveTextContent(/no se pudo conectar con el servidor/i);
    // El foco va al título, como con la pregunta.
    expect(screen.getByRole("heading", { name: NOTIFICACION.antesDeEmpezar })).toHaveFocus();
    expect(alFallar).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: NOTIFICACION.seguir }));

    expect(alFallar).toHaveBeenCalledTimes(1);
    expect(alSeguir).not.toHaveBeenCalled();
  });

  it("con un error del servidor, muestra lo que respondió", async () => {
    responder({
      "GET /api/identidad/notificacion": { estado: 500, detail: "Error interno del servidor." },
    });
    const alSeguir = vi.fn();
    render(<PreguntaAviso alSeguir={alSeguir} alFallarLaConsulta={() => {}} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Error interno del servidor.");
    expect(screen.getByRole("button", { name: NOTIFICACION.seguir })).toBeInTheDocument();
    expect(alSeguir).not.toHaveBeenCalled();
  });

  it("reintentar vuelve a consultar y, si responde, hace la pregunta", async () => {
    // La primera consulta falla y la segunda no: que aparezca la pregunta
    // prueba que se volvió a consultar.
    responder({ "GET /api/identidad/notificacion": ["sin red", NUNCA] });
    render(<PreguntaAviso alSeguir={() => {}} alFallarLaConsulta={() => {}} />);

    await userEvent.click(await screen.findByRole("button", { name: NOTIFICACION.reintentar }));

    expect(
      await screen.findByRole("heading", { name: NOTIFICACION.antesDeEmpezar }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: NOTIFICACION.otorgar })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("si el backend no responde, corta a los 60 s y lo dice", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      responder({ "GET /api/identidad/notificacion": "colgado" });
      const alSeguir = vi.fn();
      render(<PreguntaAviso alSeguir={alSeguir} alFallarLaConsulta={() => {}} />);

      await vi.advanceTimersByTimeAsync(TOPE_CONSULTA_MS - 1_000);
      expect(screen.getByText(/preparando la conversación/i)).toBeInTheDocument();

      await vi.advanceTimersByTimeAsync(1_000);

      expect(await screen.findByRole("alert")).toHaveTextContent(NOTIFICACION.consultaFallida);
      expect(screen.queryByText(/preparando la conversación/i)).toBeNull();
      expect(alSeguir).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
