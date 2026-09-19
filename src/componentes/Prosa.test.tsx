import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Prosa } from "./Prosa";

/**
 * VOCAIA-132 · el mensaje de apertura se lee como está escrito y no como está
 * guardado. El caso que da origen a esto es el encuadre real, que el backend
 * guarda en markdown y con los renglones cortados a mano.
 */

const ENCUADRE = `Hola, soy VocaIA 👋

Antes de arrancar, tres cosas para que sepas dónde estás parado:

**Soy un sistema de inteligencia artificial**, no una persona. Estoy hecho
para ayudarte a explorar qué te interesa, no para decirte qué estudiar.

¿Arrancamos? Contame un poco de vos: ¿en qué momento estás?`;

describe("Prosa", () => {
  it("muestra la negrita como negrita, sin los asteriscos", () => {
    const { container } = render(<Prosa texto={ENCUADRE} />);

    expect(container.textContent).not.toContain("**");
    expect(screen.getByText("Soy un sistema de inteligencia artificial").tagName).toBe("STRONG");
  });

  it("junta los renglones que cortó el archivo y separa los párrafos", () => {
    const { container } = render(<Prosa texto={ENCUADRE} />);

    expect(container.querySelectorAll("p")).toHaveLength(4);
    // La frase entera en un solo renglón: el corte del archivo no es el de la pantalla.
    expect(
      screen.getByText(/no una persona\. Estoy hecho para ayudarte a explorar/),
    ).toBeInTheDocument();
  });

  it("un asterisco suelto se muestra, no se come", () => {
    render(<Prosa texto="Te cobran 2 * 3 pesos." />);

    expect(screen.getByText("Te cobran 2 * 3 pesos.")).toBeInTheDocument();
  });

  it("dos negritas en el mismo párrafo salen las dos", () => {
    render(<Prosa texto="**Una** cosa y **otra** cosa." />);

    expect(screen.getByText("Una").tagName).toBe("STRONG");
    expect(screen.getByText("otra").tagName).toBe("STRONG");
  });
});
