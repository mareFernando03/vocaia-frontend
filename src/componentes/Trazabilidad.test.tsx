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
        tipo: "institucional",
      },
      {
        procedencia: "corpus",
        id: "isi-perfil",
        orden: 1,
        fuente: "Perfil del graduado ISI — https://example.org/perfil",
        puntaje: 0.82,
        estado_validacion: "provisional",
        citado: true,
        tipo: "institucional",
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
    expect(obtenerTrazabilidad).toHaveBeenCalledWith(SESION, 4);
  });

  it("si la respuesta cita algo, muestra sólo lo citado (recorrido del 22/11)", async () => {
    vi.mocked(obtenerTrazabilidad).mockResolvedValue(traza());
    render(<Trazabilidad sesionId={SESION} turno={4} />);

    const fuentes = await screen.findAllByRole("link");
    expect(fuentes.map((a) => a.textContent)).toEqual(["Perfil del graduado ISI"]);
    expect(screen.getByText("La respuesta lo cita.")).toBeInTheDocument();
    // Lo consultado sin citar eran fuentes ajenas a la pregunta: el plan de Industrial y
    // el calendario debajo de qué se ve en Análisis Matemático I.
    expect(screen.queryByText(/También se consultó/)).toBeNull();
  });

  it("si la respuesta no cita ninguna fuente, lo dice una vez", async () => {
    vi.mocked(obtenerTrazabilidad).mockResolvedValue(
      traza({
        institucional: traza().institucional.map((r) => ({ ...r, citado: false })),
      }),
    );
    render(<Trazabilidad sesionId={SESION} turno={4} />);

    const consultadas = await screen.findByRole("list", { name: /no cita ninguna/ });
    expect(within(consultadas).getAllByRole("link")).toHaveLength(2);
    expect(screen.queryByText("La respuesta lo cita.")).toBeNull();
  });

  it("no avisa que los datos son provisionales (11/11)", async () => {
    vi.mocked(obtenerTrazabilidad).mockResolvedValue(traza());
    render(<Trazabilidad sesionId={SESION} turno={4} />);

    await screen.findByRole("heading", { name: "Lo que dice la Facultad" });
    expect(screen.queryByText(/provisional|sin validar/i)).toBeNull();
  });

  it("lista cada fuente una vez y, si un fragmento suyo se citó, la marca como citada", async () => {
    const horarios = "Horarios de Ingeniería Química, UTN FRSFco — https://example.org/horarios";
    const fragmento = (anio: number, orden: number, citado: boolean) => ({
      procedencia: "corpus" as const,
      id: `horarios-ingenieria-quimica-${anio}`,
      orden,
      fuente: horarios,
      puntaje: 0.9,
      estado_validacion: "provisional",
      citado,
      tipo: "institucional" as const,
    });
    vi.mocked(obtenerTrazabilidad).mockResolvedValue(
      traza({
        institucional: [fragmento(1, 1, false), fragmento(2, 2, true), fragmento(3, 3, false)],
      }),
    );
    render(<Trazabilidad sesionId={SESION} turno={4} />);

    expect(
      await screen.findAllByRole("link", { name: /Horarios de Ingeniería Química/ }),
    ).toHaveLength(1);
    expect(screen.getByText("La respuesta lo cita.")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /consult/ })).toBeNull();
  });

  it("una reseña de cursada va en su bloque y no bajo lo que dice la Facultad (HU-22)", async () => {
    const base = traza();
    vi.mocked(obtenerTrazabilidad).mockResolvedValue(
      traza({
        institucional: [
          ...base.institucional,
          {
            procedencia: "corpus",
            id: "resena-isi-analisis-matematico-i",
            orden: 3,
            fuente: "Reseña orientativa de Análisis Matemático I, basada en el plan 2023",
            puntaje: 0.7,
            estado_validacion: "revisado_por_equipo",
            citado: true,
            tipo: "experiencial",
          },
        ],
      }),
    );
    render(<Trazabilidad sesionId={SESION} turno={4} />);

    const resenas = (await screen.findByRole("heading", { name: "Reseñas orientativas" })).closest(
      "section",
    )!;
    const facultad = screen
      .getByRole("heading", { name: "Lo que dice la Facultad" })
      .closest("section")!;

    expect(within(resenas).getByText(/Análisis Matemático I/)).toBeInTheDocument();
    expect(within(resenas).getByText("La respuesta la cita.")).toBeInTheDocument();
    expect(within(resenas).getByText(/No son información de la Facultad/)).toBeInTheDocument();
    expect(within(facultad).queryByText(/Reseña orientativa/)).toBeNull();
  });

  it("sin reseñas no dibuja su bloque", async () => {
    vi.mocked(obtenerTrazabilidad).mockResolvedValue(traza());
    render(<Trazabilidad sesionId={SESION} turno={4} />);

    await screen.findByRole("heading", { name: "Lo que dice la Facultad" });
    expect(screen.queryByRole("heading", { name: "Reseñas orientativas" })).toBeNull();
  });

  it("no muestra jerga del backend", async () => {
    vi.mocked(obtenerTrazabilidad).mockResolvedValue(traza());
    const { container } = render(<Trazabilidad sesionId={SESION} turno={4} />);
    await screen.findByText(/desarmar cosas/);

    expect(container.textContent).not.toMatch(/1[.,]37|0[.,]82|isi-plan|puntaje|valencia|\[2\]/);
  });

  it("dice que de una respuesta sin traza no quedó registrado respaldo, sin afirmar que no lo tuvo", async () => {
    vi.mocked(obtenerTrazabilidad).mockResolvedValue(
      traza({ sin_respaldo: true, conversacional: [], institucional: [] }),
    );
    render(<Trazabilidad sesionId={SESION} turno={4} />);

    // El texto está partido por el <strong>, así que se mira el párrafo entero.
    const aviso = (await screen.findByText(/no quedó registrado/)).closest("p");
    // Los turnos anteriores a que se registrara la recuperación llegan acá con
    // la parte institucional vacía aunque hayan consultado el corpus.
    expect(aviso).toHaveTextContent(/anterior a que VocaIA empezara a registrarlo/);
    expect(screen.queryByText(/no se apoya en nada/)).toBeNull();
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
    expect(screen.queryByText(/no quedó registrado/)).toBeNull();
  });
});
