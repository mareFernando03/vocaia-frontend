import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Carrera } from "../api/carreras";

/**
 * S3-05 · cada descripción de carrera se rastrea a su fuente sin salir de la
 * pantalla, el estado de validación se ve, y sin fuente no hay descripción.
 */

vi.mock("../api/carreras", () => ({ listarCarreras: vi.fn(), buscarCarreras: vi.fn() }));

const { listarCarreras, buscarCarreras } = await import("../api/carreras");
const { default: Carreras } = await import("./Carreras");

function carrera(extra: Partial<Carrera> = {}): Carrera {
  return {
    id: "ingenieria-en-sistemas-de-informacion",
    denominacion: "Ingeniería en Sistemas de Información",
    nivel: "grado",
    estado: "activa",
    estado_validacion: "provisional",
    texto: "La Ingeniería en Sistemas de Información dura cinco años.",
    fuente: "Ordenanza C.S. N.º 1877 — https://utn.edu.ar/ord-1877",
    ...extra,
  };
}

describe("Carreras", () => {
  beforeEach(() => {
    vi.mocked(listarCarreras).mockReset();
    vi.mocked(buscarCarreras).mockReset();
  });

  it("muestra cada carrera con su rótulo provisional y la fuente que respalda la descripción", async () => {
    vi.mocked(listarCarreras).mockResolvedValue([carrera()]);
    const usuario = userEvent.setup();
    render(<Carreras alVolver={() => {}} />);

    expect(await screen.findByText("Ingeniería en Sistemas de Información")).toBeInTheDocument();
    expect(screen.getByText("provisional")).toBeInTheDocument();

    await usuario.click(screen.getByText("Datos de la carrera"));
    expect(screen.getByText(/dura cinco años/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ordenanza C.S. N.º 1877" })).toHaveAttribute(
      "href",
      "https://utn.edu.ar/ord-1877",
    );
  });

  it("muestra la ficha en campos, el perfil aparte y lo que la Facultad no publica", async () => {
    vi.mocked(listarCarreras).mockResolvedValue([
      carrera({
        titulo_otorgado: "Ingeniero/a en Sistemas de Información",
        modalidad: "Presencial",
        duracion: { anios: 5, horas_reloj: 3600 },
        titulo_intermedio: { id: "tup", denominacion: "Analista Universitario" },
        norma: { ordenanza: "Ordenanza C.S. N.º 1877", anio: 2008 },
        perfil_profesional: "Diseña y mantiene sistemas de información.",
        no_publicado: ["turnos de cursado"],
      }),
    ]);
    const usuario = userEvent.setup();
    render(<Carreras alVolver={() => {}} />);
    await usuario.click(await screen.findByText("Datos de la carrera"));

    expect(screen.getByText("Título que otorga").nextSibling).toHaveTextContent(
      "Ingeniero/a en Sistemas de Información",
    );
    expect(screen.getByText("Duración").nextSibling).toHaveTextContent(
      "5 años · 3.600 horas reloj",
    );
    expect(screen.getByText("Título intermedio").nextSibling).toHaveTextContent(
      "Analista Universitario",
    );
    expect(screen.getByText("Norma").nextSibling).toHaveTextContent(
      "Ordenanza C.S. N.º 1877 (2008)",
    );
    expect(screen.getByRole("heading", { name: "Perfil profesional" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Lo que no encontramos en las fuentes que consultamos" }),
    ).toBeInTheDocument();
    expect(screen.getByText("turnos de cursado")).toBeInTheDocument();
    // Con los campos, el texto de corrido no se repite.
    expect(screen.queryByText(/dura cinco años/)).not.toBeInTheDocument();
  });

  it("si dos fuentes no coinciden lo muestra y manda a confirmar con la Secretaría", async () => {
    vi.mocked(listarCarreras).mockResolvedValue([
      carrera({
        discrepancias: [
          {
            campo: "duración en años",
            valor_adoptado: "5",
            fuente_adoptada: "la ordenanza",
            valor_alternativo: "6",
            fuente_alternativa: "el sitio de la Facultad",
          },
        ],
      }),
    ]);
    const usuario = userEvent.setup();
    render(<Carreras alVolver={() => {}} />);
    await usuario.click(await screen.findByText("Datos de la carrera"));

    expect(screen.getByText(/duración en años: «5» según la ordenanza/)).toHaveTextContent(
      "«6» según el sitio de la Facultad",
    );
    expect(screen.getByText(/confirmarlo con la Secretaría/)).toBeInTheDocument();
  });

  it("con un solo dato suelto sigue mostrando el texto de la carrera", async () => {
    vi.mocked(listarCarreras).mockResolvedValue([carrera({ no_publicado: ["turnos de cursado"] })]);
    const usuario = userEvent.setup();
    render(<Carreras alVolver={() => {}} />);
    await usuario.click(await screen.findByText("Datos de la carrera"));

    expect(screen.getByText(/dura cinco años/)).toBeInTheDocument();
    expect(screen.getByText("turnos de cursado")).toBeInTheDocument();
  });

  it("una carrera sin fuente no muestra descripción y lo dice", async () => {
    vi.mocked(listarCarreras).mockResolvedValue([carrera({ fuente: " " })]);
    render(<Carreras alVolver={() => {}} />);

    expect(await screen.findByText(/no tenemos una fuente institucional/i)).toBeInTheDocument();
    expect(screen.queryByText(/dura cinco años/)).not.toBeInTheDocument();
  });

  it("buscar ordena por parecido, aclara que no es una recomendación y deja volver al catálogo", async () => {
    vi.mocked(listarCarreras).mockResolvedValue([carrera()]);
    vi.mocked(buscarCarreras).mockResolvedValue([
      {
        carrera: carrera({ id: "tup", denominacion: "Tecnicatura en Programación" }),
        puntaje: 0.5,
      },
    ]);
    const usuario = userEvent.setup();
    render(<Carreras alVolver={() => {}} />);
    await screen.findByText("Ingeniería en Sistemas de Información");

    await usuario.type(screen.getByRole("searchbox"), "programar");
    await usuario.click(screen.getByRole("button", { name: "Buscar" }));

    expect(await screen.findByText("Tecnicatura en Programación")).toBeInTheDocument();
    expect(buscarCarreras).toHaveBeenCalledWith("programar");
    expect(screen.getByText(/no es una recomendación/i)).toBeInTheDocument();
    // El puntaje ordena; en pantalla se leería como porcentaje de acierto.
    expect(screen.queryByText(/0[.,]5/)).not.toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Ver todas" }));
    expect(await screen.findByText("Ingeniería en Sistemas de Información")).toBeInTheDocument();
  });

  it("una búsqueda sin resultados lo dice en vez de mostrar una lista vacía", async () => {
    vi.mocked(listarCarreras).mockResolvedValue([carrera()]);
    vi.mocked(buscarCarreras).mockResolvedValue([]);
    const usuario = userEvent.setup();
    render(<Carreras alVolver={() => {}} />);
    await screen.findByText("Ingeniería en Sistemas de Información");

    await usuario.type(screen.getByRole("searchbox"), "astronomía");
    await usuario.click(screen.getByRole("button", { name: "Buscar" }));

    expect(await screen.findByText(/no encontramos carreras/i)).toBeInTheDocument();
  });

  it("el catálogo vacío no afirma que el corpus no esté cargado", async () => {
    // El backend contesta lista vacía tanto si el corpus no está indexado como
    // si sus carreras están retenidas sin validar: la pantalla no puede elegir
    // una de las dos causas y no tiene que elegirla.
    vi.mocked(listarCarreras).mockResolvedValue([]);
    render(<Carreras alVolver={() => {}} />);

    const aviso = await screen.findByText(/por ahora no hay carreras para mostrar/i);
    expect(aviso).toHaveTextContent(/esperando la validación de la Facultad/i);
  });
});
