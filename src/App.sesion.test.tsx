import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import { AVISO } from "./contenido/aviso-ia";

/**
 * Lo que pasa con la puerta cuando se pierde la sesión (VOCAIA-102).
 *
 * Va aparte de `App.test.tsx` porque necesita una sesión abierta, y para eso
 * hay que reemplazar el cliente y la pantalla autenticada. Esa pantalla trae la
 * conversación entera, que acá no importa: lo único que se usa es «Salir».
 */

const { consultarUsuario, cerrarSesionEnBackend } = vi.hoisted(() => ({
  consultarUsuario: vi.fn(),
  cerrarSesionEnBackend: vi.fn(),
}));

vi.mock("./api/cliente", async (importar) => ({
  ...(await importar<typeof import("./api/cliente")>()),
  consultarUsuario,
  cerrarSesionEnBackend,
}));

vi.mock("./paginas/Autenticado", () => ({
  default: ({ alSalir }: { alSalir: () => Promise<void> }) => (
    <button type="button" onClick={() => void alSalir()}>
      Salir
    </button>
  ),
}));

afterEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
});

describe("VOCAIA-102 · la aceptación no sobrevive a la sesión", () => {
  it("«Salir» vuelve a mostrar la puerta", async () => {
    // App le pasa `salir` directo a la pantalla autenticada, sin borrar la
    // aceptación aparte: la borra el aviso al enterarse de que no hay sesión.
    // Si eso se rompe, la persona siguiente en la pestaña entra sin ver el aviso.
    const usuario = userEvent.setup();
    window.sessionStorage.setItem("vocaia.token_identidad", "token-a");
    window.sessionStorage.setItem("vocaia:aviso-ia:aceptado", AVISO.version);
    consultarUsuario.mockResolvedValue({
      identificador_opaco: "opaco-1",
      proveedor: "google",
      consentimiento_version: AVISO.version,
    });
    cerrarSesionEnBackend.mockResolvedValue(undefined);
    render(<App />);
    expect(screen.queryByRole("button", { name: AVISO.aceptar })).not.toBeInTheDocument();

    await usuario.click(await screen.findByRole("button", { name: "Salir" }));

    expect(await screen.findByRole("button", { name: AVISO.aceptar })).toBeInTheDocument();
    expect(window.sessionStorage.getItem("vocaia:aviso-ia:aceptado")).toBeNull();
  });
});
