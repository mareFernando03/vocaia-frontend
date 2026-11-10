import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { useTecladoVirtual } from "./useTecladoVirtual";

afterEach(() => vi.unstubAllGlobals());

it("oculta la barra con el teclado, pero conserva la navegación con zoom táctil", () => {
  const viewport = new EventTarget();
  Object.assign(viewport, { height: 800, scale: 1 });
  vi.stubGlobal("visualViewport", viewport);
  const { unmount } = renderHook(() => useTecladoVirtual());
  act(() => {
    Object.assign(viewport, { height: 400, scale: 2 });
    viewport.dispatchEvent(new Event("resize"));
  });
  expect(document.documentElement).not.toHaveAttribute("data-teclado");
  act(() => {
    Object.assign(viewport, { height: 400, scale: 1 });
    viewport.dispatchEvent(new Event("resize"));
  });
  expect(document.documentElement).toHaveAttribute("data-teclado");
  act(() => {
    Object.assign(viewport, { height: 800 });
    viewport.dispatchEvent(new Event("resize"));
  });
  expect(document.documentElement).not.toHaveAttribute("data-teclado");
  unmount();
  expect(document.documentElement).not.toHaveAttribute("data-teclado");
});
