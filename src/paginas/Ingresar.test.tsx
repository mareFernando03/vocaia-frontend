import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Ingresar from "./Ingresar";

/**
 * VOCAIA-131 · un ingreso rechazado tiene que decirlo.
 *
 * El defecto era mudo: Google devolvía el token, el backend lo rechazaba, y la
 * persona volvía a ver la misma pantalla sin nada que leer. Lo que se prueba
 * acá es que el motivo llegue a la pantalla, no cómo se lo obtuvo.
 */

describe("Ingresar", () => {
  it("muestra por qué fue rechazado el último intento", () => {
    render(<Ingresar alIngresar={() => {}} error="El ingreso fue rechazado." />);

    const alertas = screen.getAllByRole("alert").map((alerta) => alerta.textContent);
    expect(alertas).toContain("El ingreso fue rechazado.");
  });

  it("sin intento rechazado no inventa un error", () => {
    render(<Ingresar alIngresar={() => {}} />);

    // `queryAll` y no `getAll`: sin ninguna alerta en pantalla —que es un
    // resultado válido acá— `getAll` tira en vez de devolver la lista vacía.
    const alertas = screen.queryAllByRole("alert").map((alerta) => alerta.textContent ?? "");
    expect(alertas.some((texto) => texto.includes("rechazado"))).toBe(false);
  });
});
