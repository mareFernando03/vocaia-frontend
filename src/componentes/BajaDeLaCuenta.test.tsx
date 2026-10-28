/**
 * La baja de la cuenta (HU-04, S6-03): dos pasos, y si falla se vuelve a entrar
 * y se pide de nuevo.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ErrorDeApi } from "../api/cliente";
import { BAJA } from "../contenido/baja";
import { BajaDeLaCuenta } from "./BajaDeLaCuenta";

describe("BajaDeLaCuenta · HU-04", () => {
  it("pide confirmación antes de borrar, y la pregunta se lee primero", async () => {
    const usuario = userEvent.setup();
    const alDarDeBaja = vi.fn().mockResolvedValue(undefined);
    render(<BajaDeLaCuenta alDarDeBaja={alDarDeBaja} />);

    await usuario.click(screen.getByRole("button", { name: BAJA.boton }));

    expect(alDarDeBaja).not.toHaveBeenCalled();
    expect(screen.getByText(BAJA.pregunta)).toHaveFocus();

    await usuario.click(screen.getByRole("button", { name: BAJA.confirmar }));

    expect(alDarDeBaja).toHaveBeenCalledTimes(1);
  });

  it("dice qué se borra, que no se deshace y lo de la copia de seguridad", () => {
    render(<BajaDeLaCuenta alDarDeBaja={vi.fn()} />);

    expect(screen.getByText(/no se puede deshacer/i)).toBeInTheDocument();
    expect(screen.getByText(/hasta 7 días/)).toBeInTheDocument();
  });

  it("cancelar no borra nada y devuelve el foco al botón", async () => {
    const usuario = userEvent.setup();
    const alDarDeBaja = vi.fn();
    render(<BajaDeLaCuenta alDarDeBaja={alDarDeBaja} />);

    await usuario.click(screen.getByRole("button", { name: BAJA.boton }));
    await usuario.click(screen.getByRole("button", { name: BAJA.cancelar }));

    expect(alDarDeBaja).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: BAJA.boton })).toHaveFocus();
  });

  it("si alDarDeBaja rechaza, lo dice", async () => {
    const usuario = userEvent.setup();
    const detalle = "La baja no terminó. Probá de nuevo: lo que ya se borró no vuelve.";
    const alDarDeBaja = vi.fn().mockRejectedValueOnce(new ErrorDeApi(500, detalle));
    render(<BajaDeLaCuenta alDarDeBaja={alDarDeBaja} />);

    await usuario.click(screen.getByRole("button", { name: BAJA.boton }));
    await usuario.click(screen.getByRole("button", { name: BAJA.confirmar }));

    expect(await screen.findByRole("alert")).toHaveTextContent(detalle);
  });
});
