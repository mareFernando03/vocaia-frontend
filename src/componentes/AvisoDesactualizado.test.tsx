import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CONTACTO } from "../contenido/contacto";
import { AvisoDesactualizado } from "./AvisoDesactualizado";

describe("AvisoDesactualizado", () => {
  it("copia el correo y anuncia la confirmación", async () => {
    const usuario = userEvent.setup();
    const escribir = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    render(<AvisoDesactualizado carrera="X" />);
    await usuario.click(screen.getByRole("button", { name: "Avisar de un dato de X" }));
    await usuario.click(screen.getByRole("button", { name: /copiar la dirección/i }));
    expect(escribir).toHaveBeenCalledWith(CONTACTO.correo);
    expect(screen.getByRole("status")).toHaveTextContent("Dirección copiada");
    escribir.mockRestore();
  });

  it("si falla el portapapeles conserva el correo sin anunciar éxito", async () => {
    const usuario = userEvent.setup();
    const escribir = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockRejectedValue(new Error("sin permiso"));
    render(<AvisoDesactualizado carrera="X" />);
    await usuario.click(screen.getByRole("button", { name: "Avisar de un dato de X" }));
    await usuario.click(screen.getByRole("button", { name: /copiar la dirección/i }));
    expect(screen.getByText(CONTACTO.correo)).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    escribir.mockRestore();
  });
  it("ofrece un correo ya escrito para la carrera elegida", async () => {
    const usuario = userEvent.setup();
    render(<AvisoDesactualizado carrera="Ingeniería Electrónica" />);

    await usuario.click(
      screen.getByRole("button", { name: "Avisar de un dato de Ingeniería Electrónica" }),
    );
    const enlace = screen.getByRole("link", { name: "Abrir correo" });
    const destino = new URL(enlace.getAttribute("href")!);
    expect(destino.protocol).toBe("mailto:");
    expect(destino.pathname).toBe(CONTACTO.correo);
    expect(destino.searchParams.get("subject")).toBe("Dato desactualizado: Ingeniería Electrónica");
    expect(destino.searchParams.get("body")).toContain("«Ingeniería Electrónica»");
  });

  it("muestra el correo una sola vez, sólo al abrir la ficha elegida", async () => {
    const usuario = userEvent.setup();
    render(
      <>
        <AvisoDesactualizado carrera="Electrónica" />
        <AvisoDesactualizado carrera="Sistemas" />
      </>,
    );
    expect(screen.queryByText(CONTACTO.correo)).not.toBeInTheDocument();
    const avisar = screen.getByRole("button", { name: "Avisar de un dato de Sistemas" });
    avisar.focus();
    await usuario.keyboard("{Enter}");
    const dialogo = screen.getByRole("dialog", { name: "Avisar de un dato" });
    expect(within(dialogo).getByText("Sistemas")).toBeVisible();
    expect(screen.getAllByText(CONTACTO.correo)).toHaveLength(1);
    expect(within(dialogo).getByRole("button", { name: /copiar la dirección/i })).toBeVisible();
    await usuario.keyboard("{Escape}");
    await waitFor(() => expect(avisar).toHaveFocus());
    expect(screen.queryByText(CONTACTO.correo)).not.toBeInTheDocument();
  });
});
