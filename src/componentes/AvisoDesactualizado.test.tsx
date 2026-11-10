import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CONTACTO } from "../contenido/contacto";
import { AvisoDesactualizado } from "./AvisoDesactualizado";

describe("AvisoDesactualizado", () => {
  it("copia el correo y anuncia la confirmación", async () => {
    const usuario = userEvent.setup();
    const escribir = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    render(<AvisoDesactualizado carrera="X" />);
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
    await usuario.click(screen.getByRole("button", { name: /copiar la dirección/i }));
    expect(screen.getByText(CONTACTO.correo)).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    escribir.mockRestore();
  });
  it("abre un correo ya escrito al proyecto con el nombre de la carrera", () => {
    render(<AvisoDesactualizado carrera="Ingeniería Electrónica" />);

    const enlace = screen.getByRole("link", { name: "Avisanos" });
    const destino = new URL(enlace.getAttribute("href")!);
    expect(destino.protocol).toBe("mailto:");
    expect(destino.pathname).toBe(CONTACTO.correo);
    expect(destino.searchParams.get("subject")).toBe("Dato desactualizado: Ingeniería Electrónica");
    expect(destino.searchParams.get("body")).toContain("«Ingeniería Electrónica»");
  });

  it("la dirección también está a la vista, para el teléfono sin aplicación de correo", () => {
    render(<AvisoDesactualizado carrera="X" />);
    expect(screen.getByText(CONTACTO.correo)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copiar la dirección/i })).toBeInTheDocument();
  });
});
