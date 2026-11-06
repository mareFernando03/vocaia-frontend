import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Notificacion } from "../api/notificacion";
import { borrarToken, guardarToken } from "../auth/sesion";
import { NOTIFICACION } from "../contenido/aviso-notificacion";
import { hayQuePreguntar } from "../hooks/useAvisoPreguntado";
import PreguntaAviso from "./PreguntaAviso";

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

function responder(rutas: Record<string, Notificacion | "sin red">) {
  const espia = vi.fn(async (url: string, init?: RequestInit) => {
    const clave = `${init?.method ?? "GET"} ${new URL(url).pathname}`;
    const respuesta = rutas[clave];
    if (respuesta === undefined) throw new Error(`Pedido inesperado: ${clave}`);
    if (respuesta === "sin red") throw new TypeError("Failed to fetch");
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
    render(<PreguntaAviso alSeguir={alSeguir} />);

    const titulo = await screen.findByRole("heading", { name: NOTIFICACION.antesDeEmpezar });
    // El foco va a la pregunta: si no, un lector de pantalla no se entera.
    expect(titulo).toHaveFocus();
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
    render(<PreguntaAviso alSeguir={() => {}} />);

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
    render(<PreguntaAviso alSeguir={alSeguir} />);

    await waitFor(() => expect(alSeguir).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("heading", { name: NOTIFICACION.antesDeEmpezar })).toBeNull();
  });

  it("si no puede consultar, no le impide conversar", async () => {
    responder({ "GET /api/identidad/notificacion": "sin red" });
    const alSeguir = vi.fn();
    render(<PreguntaAviso alSeguir={alSeguir} />);

    await waitFor(() => expect(alSeguir).toHaveBeenCalledTimes(1));
  });
});
