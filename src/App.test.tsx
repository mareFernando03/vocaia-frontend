import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import App from "./App";
import { AVISO } from "./contenido/aviso-ia";

/**
 * Los criterios de aceptación de HU-02, uno por prueba.
 *
 * La divulgación es una obligación contractual con el proveedor del modelo, no
 * una cortesía de producto: lo que se prueba acá es que no se pueda usar el
 * sistema sin haberla visto.
 */

describe("HU-02 · divulgación de que se conversa con una IA", () => {
  it("muestra el aviso antes de dejar conversar", () => {
    render(<App />);

    const dialogo = screen.getByRole("dialog");
    expect(dialogo).toBeInTheDocument();
    expect(dialogo).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("heading", { name: AVISO.titulo })).toBeInTheDocument();
  });

  it("dice que es una IA y que no reemplaza orientación humana", () => {
    render(<App />);

    // Se verifica que se muestre el contenido completo del aviso y no una
    // parte: si alguien recorta un párrafo, esto lo caza.
    for (const parrafo of AVISO.parrafos) {
      expect(screen.getByText(parrafo)).toBeInTheDocument();
    }
  });

  it("no se puede esquivar con Escape", async () => {
    const usuario = userEvent.setup();
    render(<App />);

    await usuario.keyboard("{Escape}");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("no se puede esquivar clickeando afuera", async () => {
    const usuario = userEvent.setup();
    const { container } = render(<App />);

    // El fondo oscuro es el primer hijo del contenedor del diálogo.
    const fondo = container.querySelector(".fixed.inset-0");
    await usuario.click(fondo as Element);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("al aceptarlo, deja pasar y la divulgación queda visible", async () => {
    const usuario = userEvent.setup();
    render(<App />);

    await usuario.click(screen.getByRole("button", { name: AVISO.aceptar }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Persistente: la franja sigue declarando la naturaleza del sistema.
    expect(screen.getByText(/inteligencia artificial/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: AVISO.reabrir })).toBeInTheDocument();
  });

  it("el aviso completo se puede releer durante la sesión", async () => {
    const usuario = userEvent.setup();
    render(<App />);
    await usuario.click(screen.getByRole("button", { name: AVISO.aceptar }));

    await usuario.click(screen.getByRole("button", { name: AVISO.reabrir }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(AVISO.parrafos[0])).toBeInTheDocument();
  });

  it("la relectura sí se cierra con Escape, a diferencia de la puerta", async () => {
    const usuario = userEvent.setup();
    render(<App />);
    await usuario.click(screen.getByRole("button", { name: AVISO.aceptar }));
    await usuario.click(screen.getByRole("button", { name: AVISO.reabrir }));

    await usuario.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("recargar la página no vuelve a exigir la lectura", async () => {
    const usuario = userEvent.setup();
    const primeraCarga = render(<App />);
    await usuario.click(screen.getByRole("button", { name: AVISO.aceptar }));
    primeraCarga.unmount();

    render(<App />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("es operable por teclado de punta a punta", async () => {
    const usuario = userEvent.setup();
    render(<App />);

    // El foco arranca dentro del diálogo, no en la página de atrás.
    expect(screen.getByRole("dialog")).toHaveFocus();
    await usuario.tab();
    await usuario.keyboard("{Enter}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
