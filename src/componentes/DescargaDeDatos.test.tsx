/**
 * La descarga de los datos (HU-04, S6-02): avisa antes de qué tiene el archivo,
 * lo ofrece para guardar y dice cuando terminó.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ErrorDeApi } from "../api/cliente";
import { DESCARGA } from "../contenido/descarga";
import { DescargaDeDatos } from "./DescargaDeDatos";

const descargarMisDatos = vi.fn();

vi.mock("../api/perfil", () => ({
  descargarMisDatos: () => descargarMisDatos(),
}));

afterEach(() => {
  descargarMisDatos.mockReset();
});

describe("DescargaDeDatos · HU-04", () => {
  it("avisa antes de descargar que el archivo puede tener cosas delicadas", () => {
    render(<DescargaDeDatos alGuardar={vi.fn()} />);

    expect(screen.getByText(DESCARGA.cuidado)).toBeInTheDocument();
    expect(screen.getByText(/formato JSON/)).toBeInTheDocument();
  });

  it("ofrece el archivo para guardar con su nombre y lo anuncia", async () => {
    const usuario = userEvent.setup();
    const alGuardar = vi.fn();
    descargarMisDatos.mockResolvedValue({
      nombre: "vocaia-mis-datos-2026-11-02.json",
      contenido: '{"formato": "mis-datos-v1"}',
    });
    render(<DescargaDeDatos alGuardar={alGuardar} />);

    await usuario.click(screen.getByRole("button", { name: DESCARGA.boton }));

    expect(alGuardar).toHaveBeenCalledWith(
      "vocaia-mis-datos-2026-11-02.json",
      '{"formato": "mis-datos-v1"}',
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      DESCARGA.listo("vocaia-mis-datos-2026-11-02.json"),
    );
  });

  it("si el pedido falla, lo dice y no guarda nada", async () => {
    const usuario = userEvent.setup();
    const alGuardar = vi.fn();
    descargarMisDatos.mockRejectedValue(new ErrorDeApi(500, "No se pudo armar el archivo."));
    render(<DescargaDeDatos alGuardar={alGuardar} />);

    await usuario.click(screen.getByRole("button", { name: DESCARGA.boton }));

    expect(alGuardar).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: DESCARGA.boton })).toBeEnabled();
  });
});
