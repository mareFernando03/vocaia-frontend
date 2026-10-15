import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Notificacion } from "../api/notificacion";
import { borrarToken, guardarToken, obtenerToken } from "../auth/sesion";
import { NOTIFICACION } from "../contenido/aviso-notificacion";
import { ConsentimientoNotificacion } from "./ConsentimientoNotificacion";

/**
 * HU-03b · otorgar, consultar y revocar el aviso a la Facultad.
 *
 * Se falsea `fetch` y no las funciones de la API: así la prueba pasa por el
 * cliente real, que es el que borraría el token si algo cerrara la sesión.
 */

const NO_OTORGADO: Notificacion = { vigente: false };
const OTORGADO: Notificacion = {
  vigente: true,
  version: NOTIFICACION.version,
  otorgado_en: "2026-10-14T12:00:00Z",
};

function responder(rutas: Record<string, Notificacion | number>) {
  const espia = vi.fn(async (url: string, init?: RequestInit) => {
    const clave = `${init?.method ?? "GET"} ${new URL(url).pathname}`;
    const respuesta = rutas[clave];
    if (respuesta === undefined) throw new Error(`Pedido inesperado: ${clave}`);
    return typeof respuesta === "number"
      ? new Response(null, { status: respuesta })
      : Response.json(respuesta);
  });
  vi.stubGlobal("fetch", espia);
  return espia;
}

describe("ConsentimientoNotificacion (HU-03b, HU-21)", () => {
  beforeEach(() => guardarToken("token-de-prueba"));
  afterEach(() => {
    vi.unstubAllGlobals();
    borrarToken();
  });

  it("arranca sin autorizar aunque haya consentimiento de tratamiento, y no lo otorga solo", async () => {
    const espia = responder({ "GET /api/identidad/notificacion": NO_OTORGADO });
    render(<ConsentimientoNotificacion />);

    expect(await screen.findByText(NOTIFICACION.noAutorizado)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: NOTIFICACION.otorgar })).toBeInTheDocument();
    expect(espia).toHaveBeenCalledTimes(1);
  });

  it("otorgar registra la versión del texto y muestra lo que guardó el backend", async () => {
    const espia = responder({
      "GET /api/identidad/notificacion": NO_OTORGADO,
      "POST /api/identidad/notificacion": OTORGADO,
    });
    render(<ConsentimientoNotificacion />);

    await userEvent.click(await screen.findByRole("button", { name: NOTIFICACION.otorgar }));

    expect(await screen.findByText(/Lo autorizaste el 14 de octubre/)).toBeInTheDocument();
    const boton = screen.getByRole("button", { name: NOTIFICACION.revocar });
    // El mismo botón, así que el foco de quien usa teclado no se pierde.
    expect(boton).toHaveFocus();
    const [, init] = espia.mock.calls[1];
    expect(JSON.parse(String(init?.body))).toEqual({ version: NOTIFICACION.version });
  });

  it("revocar no cierra la sesión", async () => {
    const espia = responder({
      "GET /api/identidad/notificacion": OTORGADO,
      "POST /api/identidad/notificacion/revocar": {
        ...OTORGADO,
        vigente: false,
        revocado_en: "2026-10-14T13:00:00Z",
      },
    });
    render(<ConsentimientoNotificacion />);

    await userEvent.click(await screen.findByRole("button", { name: NOTIFICACION.revocar }));

    expect(await screen.findByText(NOTIFICACION.noAutorizado)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: NOTIFICACION.otorgar })).toBeInTheDocument();
    expect(obtenerToken()).toBe("token-de-prueba");
    expect(espia.mock.calls.map(([url]) => new URL(url).pathname)).not.toContain(
      "/api/identidad/salir",
    );
  });

  it("si no se puede consultar, lo dice y no ofrece autorizar a ciegas", async () => {
    responder({ "GET /api/identidad/notificacion": 500 });
    render(<ConsentimientoNotificacion />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: NOTIFICACION.otorgar })).not.toBeInTheDocument();
  });

  it("reintentar con el teclado no pierde el foco, ni mientras consulta ni al terminar", async () => {
    let contestar: (respuesta: Response) => void = () => {};
    const segunda = new Promise<Response>((resolver) => (contestar = resolver));
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status: 500 }))
        .mockReturnValueOnce(segunda),
    );
    const usuario = userEvent.setup();
    render(<ConsentimientoNotificacion />);

    const boton = await screen.findByRole("button", { name: "Reintentar" });
    boton.focus();
    await usuario.keyboard("{Enter}");

    // Mientras consulta, el botón sigue ahí, ocupado y con el foco.
    expect(boton).toBeInTheDocument();
    expect(boton).toHaveFocus();
    expect(boton).toHaveAttribute("aria-disabled", "true");

    contestar(Response.json(NO_OTORGADO));

    expect(await screen.findByRole("button", { name: NOTIFICACION.otorgar })).toHaveFocus();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
