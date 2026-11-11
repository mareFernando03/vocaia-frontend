import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { borrarToken, guardarToken } from "../auth/sesion";
import { NOTIFICACION } from "../contenido/aviso-notificacion";
import { useAvisoPreguntado } from "./useAvisoPreguntado";

const CUENTA = "opaco-1";
const CLAVE = "vocaia:aviso-facultad:preguntado:opaco-1";

afterEach(() => {
  borrarToken();
  window.sessionStorage.clear();
});

describe("useAvisoPreguntado", () => {
  it("marcar lo guarda, y al perder la sesión se olvida para la persona siguiente", () => {
    guardarToken("token-de-prueba");
    const { result } = renderHook(() => useAvisoPreguntado(CUENTA));
    act(() => result.current.marcar());
    expect(result.current.preguntado).toBe(true);
    expect(window.sessionStorage.getItem(CLAVE)).toBe(NOTIFICACION.version);

    act(() => borrarToken());

    expect(result.current.preguntado).toBe(false);
    expect(window.sessionStorage.getItem(CLAVE)).toBeNull();
  });

  it("tras un F5 con la marca puesta, arranca como ya preguntado", () => {
    window.sessionStorage.setItem(CLAVE, NOTIFICACION.version);
    const { result } = renderHook(() => useAvisoPreguntado(CUENTA));
    expect(result.current.preguntado).toBe(true);
  });
});
