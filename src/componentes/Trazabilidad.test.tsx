import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Traza } from "../api/trazabilidad";

/**
 * S3-11 · abrir una respuesta y ver de dónde salió.
 *
 * Una prueba por parte del criterio de aceptación: sin jerga, lo de la persona
 * separado de lo de la Facultad, y lo que no tiene respaldo dicho como tal.
 */

vi.mock("../api/trazabilidad", () => ({ obtenerTrazabilidad: vi.fn() }));

const { obtenerTrazabilidad } = await import("../api/trazabilidad");
const { Trazabilidad } = await import("./Trazabilidad");

const SESION = "11111111-1111-4111-8111-111111111111";

function traza(extra: Partial<Traza> = {}): Traza {
  return {
    sesion_id: SESION,
    turno: 4,
    respondida_en: "2026-09-18T12:00:00Z",
    evidencia_leida_hasta: "2026-09-18T11:59:00Z",
    sin_respaldo: false,
    conversacional: [
      {
        procedencia: "conversacion",
        id: crypto.randomUUID(),
        dimension: "I",
        fragmento: "me encanta desarmar cosas para ver cómo andan",
        sesion_id: SESION,
        turno: 3,
        valencia: 2,
        confianza: "alta",
        confianza_degradada: false,
        emitida_en: "2026-09-18T11:59:00Z",
      },
    ],
    institucional: [
      {
        procedencia: "corpus",
        id: "isi-plan",
        orden: 2,
        fuente: "Ordenanza C.S. N.º 1877 — https://example.org/1877",
        puntaje: 1.37,
        estado_validacion: "provisional",
        citado: false,
      },
      {
        procedencia: "corpus",
        id: "isi-perfil",
        orden: 1,
        fuente: "Perfil del graduado ISI — https://example.org/perfil",
        puntaje: 0.82,
        estado_validacion: "provisional",
        citado: true,
      },
    ],
    ...extra,
  };
}

beforeEach(() => vi.mocked(obtenerTrazabilidad).mockReset());

describe("Trazabilidad", () => {
  it("separa lo que contó la persona de lo que dice la Facultad", async () => {
    vi.mocked(obtenerTrazabilidad).mockResolvedValue(traza());
    render(<Trazabilidad sesionId={SESION} turno={4} />);

    const suyo = (await screen.findByRole("heading", { name: "Lo que contaste vos" })).closest(
      "section",
    )!;
    const facultad = screen
      .getByRole("heading", { name: "Lo que dice la Facultad" })
      .closest("section")!;

    expect(within(suyo).getByText(/desarmar cosas/)).toBeInTheDocument();
    expect(within(suyo).queryByText(/Ordenanza/)).toBeNull();
    expect(within(facultad).queryByText(/desarmar cosas/)).toBeNull();
    expect(within(facultad).getByText(/provisionales/)).toBeInTheDocument();
    expect(obtenerTrazabilidad).toHaveBeenCalledWith(SESION, 4);
  });

  it("pone primero lo citado y rotula lo que sólo se consultó", async () => {
    vi.mocked(obtenerTrazabilidad).mockResolvedValue(traza());
    render(<Trazabilidad sesionId={SESION} turno={4} />);

    const fuentes = await screen.findAllByRole("link");
    expect(fuentes.map((a) => a.textContent)).toEqual([
      "Perfil del graduado ISI",
      "Ordenanza C.S. N.º 1877",
    ]);
    expect(screen.getByText("La respuesta lo cita.")).toBeInTheDocument();
    expect(screen.getByText("Se consultó, pero la respuesta no lo cita.")).toBeInTheDocument();
  });

  it("no muestra jerga del backend", async () => {
    vi.mocked(obtenerTrazabilidad).mockResolvedValue(traza());
    const { container } = render(<Trazabilidad sesionId={SESION} turno={4} />);
    await screen.findByText(/desarmar cosas/);

    expect(container.textContent).not.toMatch(/1[.,]37|0[.,]82|isi-plan|puntaje|valencia|\[2\]/);
  });

  it("dice que una respuesta sin respaldo no se apoya en nada", async () => {
    vi.mocked(obtenerTrazabilidad).mockResolvedValue(
      traza({ sin_respaldo: true, conversacional: [], institucional: [] }),
    );
    render(<Trazabilidad sesionId={SESION} turno={4} />);

    expect(await screen.findByText(/no se apoya en nada/)).toBeInTheDocument();
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("no hace pasar la bienvenida por una afirmación sin respaldo", async () => {
    vi.mocked(obtenerTrazabilidad).mockResolvedValue(
      traza({
        turno: 0,
        sin_respaldo: true,
        evidencia_leida_hasta: null,
        conversacional: [],
        institucional: [],
      }),
    );
    render(<Trazabilidad sesionId={SESION} turno={0} />);

    expect(await screen.findByText(/mensaje de bienvenida/)).toBeInTheDocument();
    expect(screen.queryByText(/no se apoya en nada/)).toBeNull();
  });
});
