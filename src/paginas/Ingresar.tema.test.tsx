import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const URL_SCRIPT = "https://accounts.google.com/gsi/client";

beforeEach(() => {
  vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "cliente-de-prueba");
  vi.resetModules();
  const script = document.createElement("script");
  script.src = URL_SCRIPT;
  script.dataset.cargado = "si";
  document.head.append(script);
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  document.querySelector(`script[src="${URL_SCRIPT}"]`)?.remove();
  delete document.documentElement.dataset.tema;
});

it.each(["claro", "oscuro"])(
  "usa el tema nativo de Google en %s sin filtrar el avatar",
  async (tema) => {
    document.documentElement.dataset.tema = tema;
    const dibujar = vi.fn((contenedor: HTMLElement) => {
      const avatar = document.createElement("img");
      avatar.alt = "Foto de prueba";
      avatar.src = "https://example.invalid/avatar.png";
      contenedor.append(avatar);
    });
    const inicializar = vi.fn();
    vi.stubGlobal("google", {
      accounts: { id: { initialize: inicializar, renderButton: dibujar } },
    });
    const { default: Ingresar } = await import("./Ingresar");
    const ingresar = vi.fn();
    const { unmount } = render(<Ingresar alIngresar={ingresar} />);
    await waitFor(() => expect(dibujar).toHaveBeenCalledOnce());
    expect(dibujar).toHaveBeenLastCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ theme: tema === "oscuro" ? "outline_dark" : "outline" }),
    );
    const contenedor = dibujar.mock.calls[0][0];
    expect(contenedor.className).not.toMatch(/invert|hue-rotate|filter/);
    expect(contenedor.querySelector("img")).toHaveAttribute(
      "src",
      "https://example.invalid/avatar.png",
    );

    await act(async () => {
      document.documentElement.dataset.tema = tema === "oscuro" ? "claro" : "oscuro";
    });
    expect(dibujar).toHaveBeenCalledTimes(2);
    expect(dibujar).toHaveBeenLastCalledWith(
      contenedor,
      expect.objectContaining({ theme: tema === "oscuro" ? "outline" : "outline_dark" }),
    );
    expect(contenedor.querySelectorAll("img")).toHaveLength(1);
    expect(inicializar).toHaveBeenCalledOnce();
    const configuracion = inicializar.mock.calls[0][0];
    configuracion.callback({ credential: "credencial-de-prueba" });
    expect(ingresar).toHaveBeenCalledWith("credencial-de-prueba");

    unmount();
    await act(async () => {
      document.documentElement.dataset.tema = tema;
    });
    expect(dibujar).toHaveBeenCalledTimes(2);
  },
);

it("espera al script y utiliza el último tema elegido mientras cargaba", async () => {
  const script = document.querySelector<HTMLScriptElement>(`script[src="${URL_SCRIPT}"]`)!;
  delete script.dataset.cargado;
  document.documentElement.dataset.tema = "claro";
  const dibujar = vi.fn();
  vi.stubGlobal("google", { accounts: { id: { initialize: vi.fn(), renderButton: dibujar } } });
  const { default: Ingresar } = await import("./Ingresar");
  render(<Ingresar alIngresar={() => {}} />);
  expect(dibujar).not.toHaveBeenCalled();
  await act(async () => {
    document.documentElement.dataset.tema = "oscuro";
    script.dispatchEvent(new Event("load"));
  });
  expect(dibujar).toHaveBeenCalledOnce();
  expect(dibujar).toHaveBeenLastCalledWith(
    expect.any(HTMLElement),
    expect.objectContaining({ theme: "outline_dark" }),
  );
});
