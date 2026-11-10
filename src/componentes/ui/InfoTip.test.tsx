import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { InfoTip } from "./InfoTip";

describe("InfoTip", () => {
  it("se abre con el teclado, se cierra con Escape y devuelve el foco al botón", async () => {
    const usuario = userEvent.setup();
    render(<InfoTip tema="los datos provisionales">Sale de una fuente pública.</InfoTip>);

    const boton = screen.getByRole("button", { name: "Más sobre los datos provisionales" });
    expect(boton).toHaveAttribute("aria-expanded", "false");

    await usuario.tab();
    expect(boton).toHaveFocus();
    await usuario.keyboard("{Enter}");

    expect(boton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "los datos provisionales" })).toHaveTextContent(
      "Sale de una fuente pública.",
    );

    await usuario.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(boton).toHaveFocus();
  });

  it("la explicación queda escrita para la versión impresa, que no tiene qué tocar", () => {
    const { container } = render(<InfoTip tema="esto">Porque sí.</InfoTip>);
    const impreso = [...container.querySelectorAll("span")].find((span) =>
      span.classList.contains("print:inline"),
    );
    expect(impreso).toHaveTextContent("(Porque sí.)");
  });
});
