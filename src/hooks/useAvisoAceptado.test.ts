import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAvisoAceptado } from "./useAvisoAceptado";

/**
 * El almacenamiento puede no estar: navegación privada con almacenamiento
 * bloqueado hace que `sessionStorage` tire una excepción en vez de devolver
 * `null`. Esa rama no se puede ejercitar desde la interfaz, y es justo la que
 * decide si el aviso se muestra o se omite.
 */

afterEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("useAvisoAceptado", () => {
  it("arranca sin aceptar y registra el momento al aceptar", () => {
    const { result } = renderHook(() => useAvisoAceptado());
    expect(result.current.aceptado).toBe(false);
    expect(result.current.aceptadoEn).toBeNull();

    act(() => result.current.aceptar());

    expect(result.current.aceptado).toBe(true);
    expect(Date.parse(result.current.aceptadoEn ?? "")).not.toBeNaN();
  });

  it("si no puede leer el almacenamiento, muestra el aviso igual", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("almacenamiento bloqueado");
    });

    const { result } = renderHook(() => useAvisoAceptado());

    // Fallo seguro: mostrar el aviso de más es inocuo, omitirlo incumple RF-11.
    expect(result.current.aceptado).toBe(false);
  });

  it("si no puede escribir, la aceptación vale igual para esta carga", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("almacenamiento bloqueado");
    });
    const { result } = renderHook(() => useAvisoAceptado());

    act(() => result.current.aceptar());

    expect(result.current.aceptado).toBe(true);
  });
});
