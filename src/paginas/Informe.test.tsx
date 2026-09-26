import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CarreraInforme, Habilitante, Informe as DatosInforme } from "../api/informe";

/**
 * S4-04 · lo que la persona se lleva al cerrar: cada carrera con su porqué y
 * sus fuentes, lo que contó, los habilitantes rotulados según estén o no
 * verificados, y un informe vacío que dice por qué en vez de fallar.
 */

vi.mock("../api/informe", () => ({ obtenerInforme: vi.fn() }));

const { obtenerInforme } = await import("../api/informe");
const { ErrorDeApi } = await import("../api/cliente");
const { default: Informe } = await import("./Informe");

const SESION = "11111111-1111-4111-8111-111111111111";

function carrera(extra: Partial<CarreraInforme> = {}): CarreraInforme {
  return {
    carrera: "ingenieria-en-sistemas-de-informacion",
    titulo: "Ingeniería en Sistemas de Información",
    justificacion: "Te entusiasma resolver problemas con computadoras.",
    puntaje: 0.8,
    fuentes: [
      {
        id: "isi-perfil",
        texto: "El ingeniero en sistemas diseña sistemas de información.",
        fuente: "Ordenanza C.S. N.º 1877 — https://utn.edu.ar/ord-1877",
        estado_validacion: "provisional",
      },
    ],
    habilitantes: null,
    ...extra,
  };
}

function informe(extra: Partial<DatosInforme> = {}): DatosInforme {
  return {
    formato: 1,
    sesion_id: SESION,
    generado_en: "2026-09-25T12:00:00Z",
    publicable: true,
    version_instrumento: "instrumento-v3",
    perfil_actualizado_en: "2026-09-25T12:00:00Z",
    evidencia: [
      {
        dimension: "I",
        nombre: "Investigar y resolver",
        confianza: "alta",
        intensidad: 1.5,
        citas: [
          {
            evidencia_id: "e1",
            sesion_id: SESION,
            turno: 3,
            texto: "me encanta desarmar programas para ver cómo andan",
            valencia: 2,
          },
        ],
      },
    ],
    recomendaciones: [carrera()],
    notas: [],
    ...extra,
  };
}

function habilitante(extra: Partial<Habilitante> = {}): Habilitante {
  return {
    id: "progresar",
    denominacion: "Beca Progresar",
    organismo: "Ministerio de Capital Humano",
    vigencia_confirmada: true,
    aplicabilidad_confirmada: true,
    fuentes: [],
    ...extra,
  };
}

describe("Informe", () => {
  beforeEach(() => vi.mocked(obtenerInforme).mockReset());

  it("muestra cada carrera con su porqué, sus fuentes y lo que contó la persona", async () => {
    vi.mocked(obtenerInforme).mockResolvedValue(informe());
    render(<Informe sesionId={SESION} alVolver={() => {}} />);

    expect(
      await screen.findByRole("heading", { name: "Ingeniería en Sistemas de Información" }),
    ).toBeInTheDocument();
    expect(obtenerInforme).toHaveBeenCalledWith(SESION);
    expect(screen.getByText(/resolver problemas con computadoras/)).toBeInTheDocument();
    expect(screen.getByText(/diseña sistemas de información/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ordenanza C.S. N.º 1877" })).toHaveAttribute(
      "href",
      "https://utn.edu.ar/ord-1877",
    );
    expect(screen.getByText(/la información de la facultad es/i)).toHaveTextContent("provisional");
    expect(screen.getByRole("heading", { name: "Lo que contaste" })).toBeInTheDocument();
    expect(screen.getByText(/desarmar programas/)).toBeInTheDocument();
    // El puntaje ordena, no se muestra.
    expect(screen.queryByText(/0[.,]8/)).not.toBeInTheDocument();
  });

  it("un informe sin carreras muestra la nota del backend y no un error", async () => {
    vi.mocked(obtenerInforme).mockResolvedValue(
      informe({
        publicable: false,
        recomendaciones: [],
        evidencia: [],
        notas: ["Todavía no conversamos lo suficiente para sugerirte carreras."],
      }),
    );
    render(<Informe sesionId={SESION} alVolver={() => {}} />);

    expect(await screen.findByText(/no conversamos lo suficiente/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /carreras que te sugerimos/i })).toBeNull();
  });

  it("rotula distinto los habilitantes verificados de los que no, y dice qué falta confirmar", async () => {
    vi.mocked(obtenerInforme).mockResolvedValue(
      informe({
        recomendaciones: [
          carrera({
            habilitantes: {
              por_restriccion: [
                {
                  restriccion: "economica",
                  verificados: [habilitante()],
                  no_verificados: [
                    habilitante({
                      id: "belgrano",
                      denominacion: "Becas Belgrano",
                      aplicabilidad_confirmada: false,
                    }),
                  ],
                },
              ],
              alternativas: [],
            },
          }),
        ],
      }),
    );
    render(<Informe sesionId={SESION} alVolver={() => {}} />);

    const seccion = (await screen.findByRole("heading", { name: /si hay algo que te frena/i }))
      .parentElement!;
    expect(within(seccion).getByText(/lo que te frena es la plata/i)).toBeInTheDocument();
    expect(within(seccion).getByText("Beca Progresar").closest("li")).toHaveTextContent(
      /^Verificado:/,
    );
    const noVerificado = within(seccion).getByText("Becas Belgrano").closest("li")!;
    expect(noVerificado).toHaveTextContent(/^Sin verificar:/);
    expect(noVerificado).toHaveTextContent(/no dice si alcanza a esta carrera/);
  });

  it("sin habilitantes omite la sección, y si el backend explica por qué, muestra la nota", async () => {
    vi.mocked(obtenerInforme).mockResolvedValue(
      informe({
        recomendaciones: [
          carrera({ habilitantes: { por_restriccion: [], alternativas: [] } }),
          carrera({
            carrera: "lic-en-administracion",
            titulo: "Licenciatura en Administración",
            habilitantes: {
              por_restriccion: [],
              alternativas: [],
              nota: "Todavía no podemos mostrar los habilitantes de esta carrera.",
            },
          }),
        ],
      }),
    );
    render(<Informe sesionId={SESION} alVolver={() => {}} />);

    const titulos = await screen.findAllByRole("heading", { name: /si hay algo que te frena/i });
    expect(titulos).toHaveLength(1);
    expect(titulos[0].closest("article")).toHaveTextContent(/Licenciatura en Administración/);
    expect(screen.getByText(/todavía no podemos mostrar los habilitantes/i)).toBeInTheDocument();
  });

  it("el botón de descarga abre el diálogo de impresión", async () => {
    vi.mocked(obtenerInforme).mockResolvedValue(informe());
    const imprimir = vi.spyOn(window, "print").mockImplementation(() => {});
    const usuario = userEvent.setup();
    render(<Informe sesionId={SESION} alVolver={() => {}} />);

    await usuario.click(await screen.findByRole("button", { name: /descargar en pdf/i }));

    expect(imprimir).toHaveBeenCalledOnce();
    imprimir.mockRestore();
  });

  it("una sesión ajena o inexistente muestra el error del backend y deja reintentar", async () => {
    vi.mocked(obtenerInforme)
      .mockRejectedValueOnce(new ErrorDeApi(404, "No existe esa sesión."))
      .mockResolvedValueOnce(informe());
    const usuario = userEvent.setup();
    render(<Informe sesionId={SESION} alVolver={() => {}} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("No existe esa sesión.");
    expect(screen.queryByRole("button", { name: /descargar/i })).not.toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: /reintentar/i }));
    expect(
      await screen.findByRole("heading", { name: "Ingeniería en Sistemas de Información" }),
    ).toBeInTheDocument();
  });
});
