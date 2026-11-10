import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { useTema } from "./useTema";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  delete document.documentElement.dataset.tema;
});

it.each([false, true])(
  "respeta la elección frente al sistema aunque no pueda guardarla: %s",
  (bloqueado) => {
    const consulta = new EventTarget();
    Object.assign(consulta, { matches: false });
    vi.stubGlobal("matchMedia", (texto: string) =>
      texto.includes("color-scheme") ? consulta : { matches: true },
    );
    if (bloqueado)
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("bloqueado");
      });
    const { result } = renderHook(() => useTema());
    expect(result.current.tema).toBe("claro");
    act(() => result.current.alternar());
    expect(document.documentElement.dataset.tema).toBe("oscuro");
    act(() => consulta.dispatchEvent(new Event("change")));
    expect(result.current.tema).toBe("oscuro");
    expect(document.documentElement.dataset.tema).toBe("oscuro");
  },
);

it("sin elección sigue los cambios del sistema", () => {
  const consulta = new EventTarget();
  Object.assign(consulta, { matches: false });
  vi.stubGlobal("matchMedia", (texto: string) =>
    texto.includes("color-scheme") ? consulta : { matches: true },
  );
  const { result } = renderHook(() => useTema());
  act(() => {
    Object.assign(consulta, { matches: true });
    consulta.dispatchEvent(new Event("change"));
  });
  expect(result.current.tema).toBe("oscuro");
  expect(document.documentElement.dataset.tema).toBe("oscuro");
});
