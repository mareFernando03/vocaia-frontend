import { render, screen, waitFor } from "@testing-library/react";
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

/**
 * La huella de lo que la persona lee al aceptar. Si el texto cambia sin que
 * cambie la versión, el backend registraría como aceptado algo que no se leyó.
 */
const HUELLAS: Record<string, string> = {
  "notificacion-v1": "28c9266f29aa89d3",
};

async function huella(): Promise<string> {
  const { titulo, presentacion, detalles, opcional } = NOTIFICACION;
  const texto = new TextEncoder().encode(
    JSON.stringify({ titulo, presentacion, detalles, opcional }),
  );
  const resumen = new Uint8Array(await crypto.subtle.digest("SHA-256", texto));
  return Array.from(resumen, (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

type Respuesta = Notificacion | number | "sin red";

function responder(rutas: Record<string, Respuesta | Respuesta[]>) {
  const espia = vi.fn(async (url: string, init?: RequestInit) => {
    const clave = `${init?.method ?? "GET"} ${new URL(url).pathname}`;
    const definida = rutas[clave];
    // Una lista se va consumiendo: la primera llamada recibe la primera.
    const respuesta = Array.isArray(definida) ? definida.shift() : definida;
    if (respuesta === undefined) throw new Error(`Pedido inesperado: ${clave}`);
    if (respuesta === "sin red") throw new TypeError("Failed to fetch");
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

    expect(await screen.findByText(/Lo autorizaste el 14 de octubre de 2026/)).toBeInTheDocument();
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

  it("un fallo repetido se vuelve a anunciar", async () => {
    responder({ "GET /api/identidad/notificacion": [500, 500] });
    render(<ConsentimientoNotificacion />);

    const primero = await screen.findByRole("alert");
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    // Mismo mensaje, otro nodo: un lector de pantalla anuncia la inserción, no
    // un texto que no cambió.
    await waitFor(() => expect(screen.getByRole("alert")).not.toBe(primero));
    expect(screen.getByRole("alert")).toHaveTextContent(primero.textContent ?? "");
  });

  it("si otorgar falla, lo dice y el botón sigue usable", async () => {
    responder({
      "GET /api/identidad/notificacion": NO_OTORGADO,
      "POST /api/identidad/notificacion": 500,
    });
    render(<ConsentimientoNotificacion />);

    await userEvent.click(await screen.findByRole("button", { name: NOTIFICACION.otorgar }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    const boton = screen.getByRole("button", { name: NOTIFICACION.otorgar });
    expect(boton).toHaveFocus();
    expect(boton).toHaveAttribute("aria-disabled", "false");
    expect(screen.getByText(NOTIFICACION.noAutorizado)).toBeInTheDocument();
  });

  it("si revocar se queda sin respuesta, vuelve a preguntar y muestra lo que quedó guardado", async () => {
    responder({
      // La revocación llegó al backend, pero la respuesta se perdió.
      "GET /api/identidad/notificacion": [OTORGADO, { ...OTORGADO, vigente: false }],
      "POST /api/identidad/notificacion/revocar": "sin red",
    });
    render(<ConsentimientoNotificacion />);

    await userEvent.click(await screen.findByRole("button", { name: NOTIFICACION.revocar }));

    expect(await screen.findByText(NOTIFICACION.noAutorizado)).toBeInTheDocument();
    expect(screen.queryByText(/Lo autorizaste/)).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(NOTIFICACION.respuestaCortada);
  });

  it("al abrir no anuncia el estado; después de una acción, sí", async () => {
    responder({
      "GET /api/identidad/notificacion": NO_OTORGADO,
      "POST /api/identidad/notificacion": OTORGADO,
    });
    render(<ConsentimientoNotificacion />);

    const estado = await screen.findByText(NOTIFICACION.noAutorizado);
    expect(estado).toHaveAttribute("aria-live", "off");

    await userEvent.click(screen.getByRole("button", { name: NOTIFICACION.otorgar }));

    expect(await screen.findByText(/Lo autorizaste/)).toHaveAttribute("aria-live", "polite");
  });

  it("el texto que se acepta está atado a su versión", async () => {
    expect(
      await huella(),
      "Cambió el texto del consentimiento: subí la versión, sumala a `VERSIONES_NOTIFICACION` del backend y registrá acá su huella.",
    ).toBe(HUELLAS[NOTIFICACION.version]);
  });
});
