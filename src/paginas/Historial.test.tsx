import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ResumenSesion } from "../api/conversacion";

vi.mock("../api/conversacion", () => ({ listarSesiones: vi.fn() }));

const { listarSesiones } = await import("../api/conversacion");
const { default: Historial } = await import("./Historial");

const ID = "11111111-1111-4111-8111-111111111111";

function resumen(vistaPrevia: string): ResumenSesion {
  return {
    sesion_id: ID,
    estado: "abierta",
    iniciada_en: "2026-11-12T12:00:00Z",
    actualizada_en: "2026-11-12T12:30:00Z",
    cantidad_turnos: 4,
    vista_previa: vistaPrevia,
    tiene_informe: false,
  };
}

describe("Historial · seguir una conversación o empezar otra (VOCAIA-222)", () => {
  beforeEach(() => {
    vi.mocked(listarSesiones).mockReset();
  });

  it("explica qué hace tocar una conversación y qué trae una nueva, sin prometer memoria", async () => {
    vi.mocked(listarSesiones).mockResolvedValue([]);
    render(<Historial alRetomar={() => {}} alEmpezarNueva={() => {}} alVerInforme={() => {}} />);

    expect(screen.getByText(/seguirla donde quedó/i)).toBeInTheDocument();
    expect(
      screen.getByText(/la charla arranca de cero, pero lo que ya contaste sigue en tu perfil/i),
    ).toBeInTheDocument();
    expect(await screen.findByText(/todavía no hablaste con vocaia/i)).toBeInTheDocument();
  });

  it("cada conversación dice que se sigue, y seguirla retoma esa misma", async () => {
    const usuario = userEvent.setup();
    const alRetomar = vi.fn();
    vi.mocked(listarSesiones).mockResolvedValue([resumen("Estoy terminando el secundario")]);
    render(<Historial alRetomar={alRetomar} alEmpezarNueva={() => {}} alVerInforme={() => {}} />);

    // El nombre accesible lleva la conversación y la acción, sin palabras pegadas.
    const boton = await screen.findByRole("button", {
      name: /2 intercambios Estoy terminando el secundario Seguir$/,
    });
    await usuario.click(boton);

    expect(alRetomar).toHaveBeenCalledWith(ID);
  });
});
