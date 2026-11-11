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

const CUENTA = "opaco-1";
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
    expect(hayQuePreguntar(estado, CUENTA)).toBe(esperado);
  });
});

describe("PreguntaAviso (S7-12)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    guardarToken("token-de-prueba");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    borrarToken();
  });

  it("pide una decisión explícita y recuerda el rechazo sólo para esa cuenta", async () => {
    const espia = responder({
      "GET /api/identidad/notificacion": NUNCA,
      "POST /api/identidad/notificacion/revocar": NUNCA,
    });
    const alSeguir = vi.fn();
    render(<PreguntaAviso cuenta={CUENTA} alSeguir={alSeguir} alFallarLaConsulta={() => {}} />);

    const usuario = userEvent.setup();
    const titulo = await screen.findByRole("heading", { name: NOTIFICACION.pregunta });
    await waitFor(() => expect(titulo).toHaveFocus());
    await usuario.keyboard("{Escape}");
    expect(screen.getByRole("dialog", { name: NOTIFICACION.pregunta })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: NOTIFICACION.autorizarYEmpezar }),
    ).toBeInTheDocument();
    expect(alSeguir).not.toHaveBeenCalled();

    await usuario.click(screen.getByRole("button", { name: NOTIFICACION.empezarSinAutorizar }));

    expect(alSeguir).toHaveBeenCalledTimes(1);
    expect(hayQuePreguntar(NUNCA, CUENTA)).toBe(false);
    expect(hayQuePreguntar(NUNCA, "opaco-2")).toBe(true);
    expect(espia.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });

  it("autorizar registra la misma versión que Perfil y abre la conversación", async () => {
    const espia = responder({
      "GET /api/identidad/notificacion": NUNCA,
      "POST /api/identidad/notificacion": OTORGADO,
    });
    const alSeguir = vi.fn();
    render(<PreguntaAviso cuenta={CUENTA} alSeguir={alSeguir} alFallarLaConsulta={() => {}} />);

    await userEvent.click(
      await screen.findByRole("button", { name: NOTIFICACION.autorizarYEmpezar }),
    );

    expect(alSeguir).toHaveBeenCalledTimes(1);
    const otorgamiento = espia.mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(String(otorgamiento?.[1]?.body))).toEqual({ version: NOTIFICACION.version });
  });

  it("mantiene el modal abierto si falla el guardado y permite elegir después", async () => {
    responder({
      "GET /api/identidad/notificacion": NUNCA,
      "POST /api/identidad/notificacion": "sin red",
      "POST /api/identidad/notificacion/revocar": REVOCADO,
    });
    const alSeguir = vi.fn();
    render(<PreguntaAviso cuenta={CUENTA} alSeguir={alSeguir} alFallarLaConsulta={() => {}} />);

    const autorizar = await screen.findByRole("button", { name: NOTIFICACION.autorizarYEmpezar });
    await userEvent.click(autorizar);
    expect(await screen.findByRole("alert")).toHaveTextContent(/no se pudo conectar/i);
    expect(alSeguir).not.toHaveBeenCalled();
    expect(autorizar).toHaveFocus();

    await userEvent.click(screen.getByRole("button", { name: NOTIFICACION.empezarSinAutorizar }));
    expect(alSeguir).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["ya lo tiene autorizado", OTORGADO],
    ["lo dejó de autorizar", REVOCADO],
  ] as const)("si %s, sigue sola a la conversación", async (_, estado) => {
    responder({ "GET /api/identidad/notificacion": estado });
    const alSeguir = vi.fn();
    render(<PreguntaAviso cuenta={CUENTA} alSeguir={alSeguir} alFallarLaConsulta={() => {}} />);

    await waitFor(() => expect(alSeguir).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("dialog", { name: NOTIFICACION.pregunta })).toBeNull();
  });

  it("sin red, lo dice y deja seguir sin darla por hecha", async () => {
    responder({ "GET /api/identidad/notificacion": "sin red" });
    const alSeguir = vi.fn();
    const alFallar = vi.fn();
    render(<PreguntaAviso cuenta={CUENTA} alSeguir={alSeguir} alFallarLaConsulta={alFallar} />);

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
    render(<PreguntaAviso cuenta={CUENTA} alSeguir={alSeguir} alFallarLaConsulta={() => {}} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Error interno del servidor.");
    expect(screen.getByRole("button", { name: NOTIFICACION.seguir })).toBeInTheDocument();
    expect(alSeguir).not.toHaveBeenCalled();
  });

  it("reintentar vuelve a consultar y, si responde, hace la pregunta", async () => {
    // La primera consulta falla y la segunda no: que aparezca la pregunta
    // prueba que se volvió a consultar.
    responder({ "GET /api/identidad/notificacion": ["sin red", NUNCA] });
    render(<PreguntaAviso cuenta={CUENTA} alSeguir={() => {}} alFallarLaConsulta={() => {}} />);

    await userEvent.click(await screen.findByRole("button", { name: NOTIFICACION.reintentar }));

    expect(await screen.findByRole("dialog", { name: NOTIFICACION.pregunta })).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: NOTIFICACION.autorizarYEmpezar }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("si el backend no responde, corta a los 60 s y lo dice", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      responder({ "GET /api/identidad/notificacion": "colgado" });
      const alSeguir = vi.fn();
      render(<PreguntaAviso cuenta={CUENTA} alSeguir={alSeguir} alFallarLaConsulta={() => {}} />);

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
