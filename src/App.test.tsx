import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import indexHtml from "../index.html?raw";
import App from "./App";
import { AVISO } from "./contenido/aviso-ia";

/**
 * Los criterios de aceptación de HU-02, uno por prueba.
 *
 * La divulgación es una obligación contractual con el proveedor del modelo, no
 * una cortesía de producto: lo que se prueba acá es que no se pueda usar el
 * sistema sin haberla visto.
 */

describe("HU-02 · divulgación de que se conversa con una IA", () => {
  it("muestra el aviso antes de dejar conversar", () => {
    render(<App />);

    const dialogo = screen.getByRole("dialog");
    expect(dialogo).toBeInTheDocument();
    expect(dialogo).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("heading", { name: AVISO.titulo })).toBeInTheDocument();
  });

  it("dice que es una IA y que no reemplaza orientación humana", () => {
    render(<App />);

    // Se verifica que se muestre el contenido completo del aviso y no una
    // parte: si alguien recorta un párrafo, esto lo caza.
    for (const parrafo of AVISO.parrafos) {
      expect(screen.getByText(parrafo)).toBeInTheDocument();
    }
  });

  it("no se puede esquivar con Escape", async () => {
    const usuario = userEvent.setup();
    render(<App />);

    await usuario.keyboard("{Escape}");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("no se puede esquivar clickeando afuera", async () => {
    const usuario = userEvent.setup();
    const { container } = render(<App />);

    // El fondo oscuro es el primer hijo del contenedor del diálogo.
    const fondo = container.querySelector(".fixed.inset-0");
    await usuario.click(fondo as Element);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("al aceptarlo, deja pasar y la divulgación queda visible", async () => {
    const usuario = userEvent.setup();
    render(<App />);

    await usuario.click(screen.getByRole("button", { name: AVISO.aceptar }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Persistente: la franja sigue declarando la naturaleza del sistema.
    expect(screen.getByText(/inteligencia artificial/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: AVISO.reabrir })).toBeInTheDocument();
  });

  it("el aviso completo se puede releer durante la sesión", async () => {
    const usuario = userEvent.setup();
    render(<App />);
    await usuario.click(screen.getByRole("button", { name: AVISO.aceptar }));

    await usuario.click(screen.getByRole("button", { name: AVISO.reabrir }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(AVISO.parrafos[0])).toBeInTheDocument();
  });

  it("la relectura sí se cierra con Escape, a diferencia de la puerta", async () => {
    const usuario = userEvent.setup();
    render(<App />);
    await usuario.click(screen.getByRole("button", { name: AVISO.aceptar }));
    await usuario.click(screen.getByRole("button", { name: AVISO.reabrir }));

    await usuario.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("recargar la página no vuelve a exigir la lectura", async () => {
    const usuario = userEvent.setup();
    const primeraCarga = render(<App />);
    await usuario.click(screen.getByRole("button", { name: AVISO.aceptar }));
    primeraCarga.unmount();

    render(<App />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("es operable por teclado de punta a punta", async () => {
    const usuario = userEvent.setup();
    render(<App />);

    // El foco arranca dentro del diálogo, no en la página de atrás.
    expect(screen.getByRole("dialog")).toHaveFocus();
    await usuario.tab();
    await usuario.keyboard("{Enter}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("tampoco se puede esquivar con Tab", async () => {
    const usuario = userEvent.setup();
    render(<App />);
    const dialogo = screen.getByRole("dialog");

    // Muchas más tabulaciones que elementos focalizables: si el foco puede
    // salir, en alguna vuelta sale. Es el agujero que deja una puerta que solo
    // frena el mouse y Escape.
    for (let vuelta = 0; vuelta < 8; vuelta += 1) {
      await usuario.tab();
      expect(dialogo.contains(document.activeElement)).toBe(true);
    }
  });

  it("con la puerta abierta, el fondo queda fuera del alcance del teclado", () => {
    const { container } = render(<App />);

    expect(container.querySelector("[inert]")).not.toBeNull();
    // El disparador de relectura ni siquiera se dibuja mientras no acepte: si
    // lo hiciera, se lo podría accionar y la relectura saltaría sola al pasar.
    expect(screen.queryByRole("button", { name: AVISO.reabrir })).not.toBeInTheDocument();
  });

  it("seleccionar texto arrastrando hasta afuera no cierra la relectura", async () => {
    const usuario = userEvent.setup();
    render(<App />);
    await usuario.click(screen.getByRole("button", { name: AVISO.aceptar }));
    await usuario.click(screen.getByRole("button", { name: AVISO.reabrir }));

    const dialogo = screen.getByRole("dialog");
    const fondo = dialogo.parentElement as HTMLElement;
    // Apretar adentro y soltar afuera dispara el click sobre el ancestro común.
    await usuario.pointer([
      { target: dialogo, keys: "[MouseLeft>]" },
      { target: fondo, keys: "[/MouseLeft]" },
    ]);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("un clic limpio en el fondo sí cierra la relectura", async () => {
    const usuario = userEvent.setup();
    render(<App />);
    await usuario.click(screen.getByRole("button", { name: AVISO.aceptar }));
    await usuario.click(screen.getByRole("button", { name: AVISO.reabrir }));
    const fondo = screen.getByRole("dialog").parentElement as HTMLElement;

    await usuario.click(fondo);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("al cerrar la relectura, el foco vuelve al botón que la abrió", async () => {
    const usuario = userEvent.setup();
    render(<App />);
    await usuario.click(screen.getByRole("button", { name: AVISO.aceptar }));
    const disparador = screen.getByRole("button", { name: AVISO.reabrir });
    await usuario.click(disparador);

    await usuario.keyboard("{Escape}");

    expect(disparador).toHaveFocus();
  });
});

/**
 * HU-08 · acceso desde cualquier dispositivo (RNF-08, RNF-01).
 *
 * Lo que jsdom **no** puede probar: no calcula diseño ni aplica las clases de
 * Tailwind, así que no sabe cuánto mide nada ni en qué punto de quiebre está.
 * El criterio «accesible desde navegador de escritorio y móvil» se verifica a
 * mano en un navegador real; acá quedan las partes que sí son estructurales y
 * que son las que se rompen sin que nadie se entere.
 *
 * El tercer criterio de aceptación —contraste mínimo— lo cubre el verificador
 * ejecutable de VOCAIA-59, no este archivo.
 */
describe("HU-08 · acceso desde cualquier dispositivo", () => {
  it("declara el viewport, sin lo cual el móvil dibuja a 980 px y se ve todo diminuto", () => {
    // Vive en index.html, fuera del árbol de React, y por eso es justo lo que
    // alguien borra sin notar el efecto: la página sigue funcionando en el
    // escritorio y se vuelve ilegible en el celular.
    // Se lee con el `?raw` de Vite y no con `node:fs`: bajo jsdom
    // `import.meta.url` no es un `file://`, y traer `@types/node` para que
    // `tsc` acepte el import sería sumar una dependencia por una sola línea.
    expect(indexHtml).toMatch(/<meta\s+name="viewport"[^>]*width=device-width/);
  });

  it("la primera parada del tabulador es el salto al contenido", async () => {
    const usuario = userEvent.setup();
    render(<App />);
    await usuario.click(screen.getByRole("button", { name: AVISO.aceptar }));

    await usuario.tab();

    const salto = screen.getByRole("link", { name: /saltar al contenido/i });
    expect(salto).toHaveFocus();
    expect(salto).toHaveAttribute("href", "#contenido");
  });

  it("el salto tiene destino y el destino puede recibir el foco", async () => {
    const usuario = userEvent.setup();
    render(<App />);
    await usuario.click(screen.getByRole("button", { name: AVISO.aceptar }));

    const contenido = screen.getByRole("main");
    // Sin `tabIndex`, algunos navegadores hacen scroll pero dejan el foco
    // arriba, y el Tab siguiente vuelve al principio: el salto no sirve.
    expect(contenido).toHaveAttribute("id", "contenido");
    expect(contenido).toHaveAttribute("tabindex", "-1");
  });

  it("con la puerta abierta el salto tampoco es alcanzable", () => {
    const { container } = render(<App />);

    // Si quedara fuera del contenedor `inert` sería un atajo para empezar a
    // usar el sistema sin haber visto la divulgación.
    const salto = screen.getByRole("link", { name: /saltar al contenido/i });
    expect(container.querySelector("[inert]")?.contains(salto)).toBe(true);
  });

  it("los controles llegan al área táctil mínima", async () => {
    const usuario = userEvent.setup();
    render(<App />);

    // 44 px es **WCAG 2.5.5** Target Size (Enhanced), nivel AAA. El mínimo
    // exigible es 2.5.8 Target Size (Minimum), AA, que pide 24×24: acá se
    // cumple de más, a propósito, porque el público usa el sistema desde el
    // teléfono.
    //
    // jsdom no mide, así que se verifica la clase que fija el alto. Es una
    // prueba de intención: caza a quien borre `min-h-11`, no a quien rompa el
    // área táctil por otro lado. En particular **no cubre el ancho**, que hoy
    // lo dan el relleno horizontal y el texto de cada botón; un botón de solo
    // ícono pasaría esta prueba y aun así sería un blanco de 44×24.
    expect(screen.getByRole("button", { name: AVISO.aceptar })).toHaveClass("min-h-11");

    await usuario.click(screen.getByRole("button", { name: AVISO.aceptar }));
    expect(screen.getByRole("button", { name: AVISO.reabrir })).toHaveClass("min-h-11");
  });
});
