import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AvisoIA as ContenidoAviso } from "../contenido/aviso-ia";

/**
 * La sección "dónde hablar con una persona" depende de la gestión G-02, que
 * todavía no cerró. Estas pruebas fijan las dos mitades de esa decisión: hoy no
 * se muestra nada, y el día que se carguen los contactos se muestran solos, sin
 * tocar el componente.
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
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("con contactos cargados, los muestra sin tocar el componente", () => {
    estadoDelContenido.canales = [
      { nombre: "Gabinete", detalle: "gabinete@ejemplo.edu.ar", href: "mailto:x@ejemplo.edu.ar" },
      { nombre: "Consejería", detalle: "Aula 12, lunes a viernes" },
    ];

    render(<AvisoIA modo="puerta" onAceptar={() => {}} />);

    expect(screen.getByRole("heading", { name: /dónde hablar/i })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "gabinete@ejemplo.edu.ar" })).toBeInTheDocument();
    expect(screen.getByText("Aula 12, lunes a viernes")).toBeInTheDocument();
  });

  it("el diálogo se anuncia con su propio título", () => {
    render(<AvisoIA modo="puerta" onAceptar={() => {}} />);

    const dialogo = screen.getByRole("dialog");
    const titulo = screen.getByRole("heading", { level: 2 });
    expect(dialogo).toHaveAttribute("aria-labelledby", titulo.id);
  });
});
