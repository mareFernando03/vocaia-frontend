import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { borrarToken, guardarToken } from "../auth/sesion";
import { useAvisoPreguntado } from "./useAvisoPreguntado";

const CLAVE = "vocaia:aviso-facultad:preguntado";

afterEach(() => {
  borrarToken();
  window.sessionStorage.clear();
});

describe("useAvisoPreguntado", () => {
  it("marcar lo guarda, y al perder la sesión se olvida para la persona siguiente", () => {
    guardarToken("token-de-prueba");
    const { result } = renderHook(() => useAvisoPreguntado());
    act(() => result.current.marcar());
    expect(result.current.preguntado).toBe(true);
    expect(window.sessionStorage.getItem(CLAVE)).toBe("si");

    act(() => borrarToken());

    expect(result.current.preguntado).toBe(false);
    expect(window.sessionStorage.getItem(CLAVE)).toBeNull();
  });

  it("tras un F5 con la marca puesta, arranca como ya preguntado", () => {
    window.sessionStorage.setItem(CLAVE, "si");
    const { result } = renderHook(() => useAvisoPreguntado());
    expect(result.current.preguntado).toBe(true);
  });
});
