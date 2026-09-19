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

  /**
   * El caso sale de la corrida del 19/09 (`informes/sesion-completa-2026-09-19.json`
   * del backend): de los tres perfiles, P-B cerró la sesión con una devolución en
   * lista. Juntando esos renglones, la devolución —que es lo que la persona se
   * lleva— queda como un párrafo corrido con guiones adentro.
   */
  const DEVOLUCION = `De lo que me contaste, me quedó esto:
- Te enganchan las cosas concretas: arreglar, probar, soldar.
- Te gusta cuando hay resultado visible. No tanto hacer por hacer.
- También te mueve ayudar a que otro entienda, como con matemática.

Si querés, el próximo paso puede ser mirar eso último.`;

  it("una lista se lee como lista y no como un párrafo con guiones", () => {
    const { container } = render(<Prosa texto={DEVOLUCION} />);

    expect(container.querySelectorAll("li")).toHaveLength(3);
    expect(
      screen.getByText("Te gusta cuando hay resultado visible. No tanto hacer por hacer."),
    ).toBeInTheDocument();
  });

  it("el renglón de entrada de la lista sigue siendo un párrafo, y lo que sigue también", () => {
    const { container } = render(<Prosa texto={DEVOLUCION} />);

    const parrafos = [...container.querySelectorAll("p")].map((p) => p.textContent);
    expect(parrafos).toEqual([
      "De lo que me contaste, me quedó esto:",
      "Si querés, el próximo paso puede ser mirar eso último.",
    ]);
  });

  it("los renglones cortados a mano se siguen juntando, que es el caso del encuadre", () => {
    const { container } = render(
      <Prosa
        texto={`Un renglón
cortado a mano.`}
      />,
    );

    expect(container.querySelectorAll("li")).toHaveLength(0);
    expect(screen.getByText("Un renglón cortado a mano.")).toBeInTheDocument();
  });

  it("un guion de diálogo pegado a la palabra no abre una lista", () => {
    const { container } = render(<Prosa texto="Te dijo -esto- y nada más." />);

    expect(container.querySelectorAll("li")).toHaveLength(0);
    expect(screen.getByText("Te dijo -esto- y nada más.")).toBeInTheDocument();
  });

  it("la negrita adentro de un ítem se respeta", () => {
    render(<Prosa texto={"- Te mueve **hacer cosas con las manos**."} />);

    expect(screen.getByText("hacer cosas con las manos").tagName).toBe("STRONG");
  });
});
