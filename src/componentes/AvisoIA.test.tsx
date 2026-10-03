import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AvisoIA as ContenidoAviso } from "../contenido/aviso-ia";

/**
 * La sección "dónde hablar con una persona" se dibuja sólo si hay contactos
 * cargados. Desde aviso-v2 los hay (G-02, la SCPU), pero las dos mitades de la
 * decisión siguen fijadas: sin contactos no se muestra nada, y con contactos se
 * muestran solos, sin tocar el componente.
 */

const { estadoDelContenido } = vi.hoisted(() => ({
  estadoDelContenido: { canales: [] as ContenidoAviso["canales"] },
}));

vi.mock("../contenido/aviso-ia", async (original) => {
  const modulo = await original<typeof import("../contenido/aviso-ia")>();
  return {
    ...modulo,
    get AVISO() {
      return { ...modulo.AVISO, canales: estadoDelContenido.canales };
    },
  };
});

const { AvisoIA } = await import("./AvisoIA");

describe("AvisoIA · derivación a orientación humana", () => {
  beforeEach(() => {
    estadoDelContenido.canales = [];
  });

  it("sin contactos cargados, no dibuja una sección de ayuda vacía", () => {
    render(<AvisoIA modo="puerta" onAceptar={() => {}} />);

    expect(screen.queryByRole("heading", { name: /dónde hablar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("con contactos cargados, los muestra sin tocar el componente", () => {
    estadoDelContenido.canales = [
      { nombre: "Gabinete", detalle: "gabinete@ejemplo.edu.ar", href: "mailto:x@ejemplo.edu.ar" },
      { nombre: "Consejería", detalle: "Aula 12, lunes a viernes" },
    ];

    render(<AvisoIA modo="puerta" onAceptar={() => {}} />);

    const titulo = screen.getByRole("heading", { name: /dónde hablar/i });
    const seccion = titulo.closest("section") as HTMLElement;
    expect(within(seccion).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "gabinete@ejemplo.edu.ar" })).toBeInTheDocument();
    expect(screen.getByText("Aula 12, lunes a viernes")).toBeInTheDocument();
  });

  it("los contactos de aviso-v2 son los de la Secretaría, con enlaces que funcionan", async () => {
    const { AVISO } =
      await vi.importActual<typeof import("../contenido/aviso-ia")>("../contenido/aviso-ia");
    estadoDelContenido.canales = AVISO.canales;

    render(<AvisoIA modo="puerta" onAceptar={() => {}} />);

    expect(screen.getByText(AVISO.presentacionAyuda)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "scpu@fr.sanfrancisco.utn.edu.ar" })).toHaveAttribute(
      "href",
      "mailto:scpu@fr.sanfrancisco.utn.edu.ar",
    );
    expect(screen.getByRole("link", { name: /421147/ })).toHaveAttribute(
      "href",
      "tel:+543564421147",
    );
    expect(screen.getByRole("link", { name: /236255/ })).toHaveAttribute(
      "href",
      "https://wa.me/5493564236255",
    );
  });

  it("el diálogo se anuncia con su propio título", () => {
    render(<AvisoIA modo="puerta" onAceptar={() => {}} />);

    const dialogo = screen.getByRole("dialog");
    const titulo = screen.getByRole("heading", { level: 2 });
    expect(dialogo).toHaveAttribute("aria-labelledby", titulo.id);
  });
});
