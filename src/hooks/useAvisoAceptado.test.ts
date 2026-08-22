import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AVISO } from "../contenido/aviso-ia";
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
  it("arranca sin aceptar y registra la versión al aceptar", () => {
    const { result } = renderHook(() => useAvisoAceptado());
    expect(result.current.aceptado).toBe(false);
    expect(result.current.version).toBeNull();

    act(() => result.current.aceptar());

    expect(result.current.aceptado).toBe(true);
    // La versión es lo que después se registra como consentido (HU-03a).
    expect(result.current.version).toBe(AVISO.version);
  });

  it("si el aviso cambió, lo aceptado antes no cuenta y la puerta vuelve", () => {
    // Es para lo que sirve versionarlo: quien aceptó otro texto no consintió
    // este. Sin esto, un cambio en el aviso pasaría inadvertido y el registro
    // del backend diría que aceptó algo que nunca vio.
    window.sessionStorage.setItem("vocaia:aviso-ia:aceptado", "aviso-de-otra-epoca");

    const { result } = renderHook(() => useAvisoAceptado());

    expect(result.current.aceptado).toBe(false);
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
