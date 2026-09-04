import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EventoConversacion, Historial, ResumenSesion, Turno } from "../api/conversacion";

/**
 * El criterio de aceptación de S2-04 (HU-12): «se retoma una conversación de
 * otro día y el hilo continúa».
 *
 * Se prueba acá y no sobre `Historial` a secas porque la parte que se puede
 * romper en silencio no es el listado —eso se ve—, sino el paso de elegir una
 * sesión a que la conversación cargue **esa** y siga escribiendo en **esa**. Un
 * listado que se dibuja bien y manda los mensajes nuevos a una sesión en blanco
 * cumple con la pantalla y falla el criterio.
 */

vi.mock("../api/conversacion", () => ({
  listarSesiones: vi.fn(),
  obtenerHistorial: vi.fn(),
  enviarMensaje: vi.fn(),
}));

vi.mock("../api/perfil", () => ({ obtenerPerfil: vi.fn() }));

const { listarSesiones, obtenerHistorial, enviarMensaje } = await import("../api/conversacion");
const { obtenerPerfil } = await import("../api/perfil");
const { default: Autenticado } = await import("./Autenticado");

const CLAVE = "vocaia:conversacion:sesion";
const ANTERIOR = "22222222-2222-4222-8222-222222222222";

function turno(numero: number, rol: string, contenido: string): Turno {
  return { numero, rol, contenido, ocurrido_en: "2026-08-24T12:00:00Z" };
}

function historial(sesionId: string, turnos: Turno[]): Historial {
  return {
    sesion_id: sesionId,
    estado: "abierta",
    turnos,
    iniciada_en: "2026-08-24T12:00:00Z",
    actualizada_en: "2026-08-24T12:00:00Z",
    version_instrumento: "v1",
    version_prompt: "sistema-v3",
  };
}

function resumen(sesionId: string, vistaPrevia: string): ResumenSesion {
  return {
    sesion_id: sesionId,
    estado: "abierta",
    iniciada_en: "2026-08-24T12:00:00Z",
    actualizada_en: "2026-08-24T12:30:00Z",
    cantidad_turnos: 2,
    vista_previa: vistaPrevia,
  };
}

function flujo(...eventos: EventoConversacion[]) {
  return (async function* () {
    for (const evento of eventos) yield evento;
  })();
}

const salir = () => Promise.resolve();

describe("HU-12 · historial de sesiones recuperable", () => {
  beforeEach(() => {
    vi.mocked(listarSesiones).mockReset();
    vi.mocked(obtenerHistorial).mockReset();
    vi.mocked(enviarMensaje).mockReset();
    window.sessionStorage.clear();
  });

  it("se retoma una conversación de otro día y el hilo continúa", async () => {
    const usuario = userEvent.setup();
    vi.mocked(listarSesiones).mockResolvedValue([
      resumen(ANTERIOR, "Estoy entre sistemas y diseño"),
    ]);
    vi.mocked(obtenerHistorial).mockImplementation((id: string) =>
      Promise.resolve(
        historial(id, [
          turno(1, "usuario", "Estoy entre sistemas y diseño"),
          turno(2, "agente", "¿Qué te atrae de cada una?"),
        ]),
      ),
    );

    render(<Autenticado alSalir={salir} />);
    // La pestaña nueva abre en la conversación y no en el listado: es lo que
    // hace que recargar en medio de una charla devuelva a la charla (HU-07).
    expect(screen.getByRole("heading", { name: /tu conversación/i })).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: /tus conversaciones/i }));
    await usuario.click(await screen.findByRole("button", { name: /entre sistemas y diseño/ }));

    // El hilo de aquel día vuelve entero…
    await waitFor(() => expect(screen.getByText("¿Qué te atrae de cada una?")).toBeInTheDocument());
    expect(obtenerHistorial).toHaveBeenCalledWith(ANTERIOR);

    // …y lo que se escriba ahora sigue esa misma sesión, no una en blanco.
    vi.mocked(enviarMensaje).mockReturnValue(
      flujo({ delta: "Dale." }, { fin: true, turno_usuario: 3, turno_agente: 4, fuentes: [] }),
    );
    await usuario.type(screen.getByLabelText(/escribí tu mensaje/i), "Sistemas, creo");
    await usuario.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() => expect(enviarMensaje).toHaveBeenCalledWith(ANTERIOR, "Sistemas, creo"));
  });

  it("empezar una conversación nueva no arrastra la anterior", async () => {
    const usuario = userEvent.setup();
    window.sessionStorage.setItem(CLAVE, ANTERIOR);
    vi.mocked(listarSesiones).mockResolvedValue([
      resumen(ANTERIOR, "Estoy entre sistemas y diseño"),
    ]);
    vi.mocked(obtenerHistorial).mockImplementation((id: string) =>
      Promise.resolve(historial(id, [turno(1, "usuario", "Estoy entre sistemas y diseño")])),
    );

    render(<Autenticado alSalir={salir} />);
    await screen.findByText("Estoy entre sistemas y diseño");

    await usuario.click(screen.getByRole("button", { name: /tus conversaciones/i }));
    await usuario.click(screen.getByRole("button", { name: /empezar una conversación nueva/i }));

    expect(screen.getByText(/contame por dónde andás/i)).toBeInTheDocument();
    expect(screen.queryByText("Estoy entre sistemas y diseño")).not.toBeInTheDocument();
    // Y la sesión anterior dejó de ser la activa: un F5 tampoco la trae de vuelta.
    expect(window.sessionStorage.getItem(CLAVE)).toBeNull();
  });

  it("el listado se opera con teclado de punta a punta", async () => {
    const usuario = userEvent.setup();
    vi.mocked(listarSesiones).mockResolvedValue([
      resumen(ANTERIOR, "Estoy entre sistemas y diseño"),
    ]);
    vi.mocked(obtenerHistorial).mockResolvedValue(
      historial(ANTERIOR, [turno(1, "usuario", "Estoy entre sistemas y diseño")]),
    );

    render(<Autenticado alSalir={salir} />);
    await usuario.click(screen.getByRole("button", { name: /tus conversaciones/i }));
    await screen.findByRole("button", { name: /entre sistemas y diseño/ });

    // El orden de tabulación sigue al del documento: primero volver, después
    // las conversaciones. Si alguien mueve el botón en el marcado, esto lo caza.
    await usuario.tab();
    expect(screen.getByRole("button", { name: /^volver$/i })).toHaveFocus();
    await usuario.tab();
    const item = screen.getByRole("button", { name: /entre sistemas y diseño/ });
    expect(item).toHaveFocus();

    // Y se activa con Enter, no sólo con el mouse: cada ítem es un botón de
    // verdad y no un div con un manejador de clic encima.
    await usuario.keyboard("{Enter}");

    await waitFor(() => expect(obtenerHistorial).toHaveBeenCalledWith(ANTERIOR));
  });

  it("cada conversación se anuncia como un solo objetivo, con su fecha y su tamaño", async () => {
    const usuario = userEvent.setup();
    vi.mocked(listarSesiones).mockResolvedValue([
      resumen(ANTERIOR, "Estoy entre sistemas y diseño"),
    ]);

    render(<Autenticado alSalir={salir} />);
    await usuario.click(screen.getByRole("button", { name: /tus conversaciones/i }));

    // Un solo botón por conversación, con todo adentro: quien usa lector de
    // pantalla oye «28 de agosto de 2026, 2 mensajes, Estoy entre…» de una vez,
    // en lugar de tres elementos sueltos que hay que juntar mentalmente.
    const item = await screen.findByRole("button", { name: /entre sistemas y diseño/ });
    expect(item).toHaveAccessibleName(
      /^24 de agosto de 2026 · 2 mensajes Estoy entre sistemas y diseño$/,
    );
  });

  it("sin conversaciones previas lo dice, en vez de mostrar una lista vacía", async () => {
    const usuario = userEvent.setup();
    vi.mocked(listarSesiones).mockResolvedValue([]);

    render(<Autenticado alSalir={salir} />);
    await usuario.click(screen.getByRole("button", { name: /tus conversaciones/i }));

    expect(await screen.findByText(/todavía no hablaste con vocaia/i)).toBeInTheDocument();
  });

  it("si el listado falla, avisa y deja reintentar", async () => {
    const usuario = userEvent.setup();
    vi.mocked(listarSesiones).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    vi.mocked(listarSesiones).mockResolvedValueOnce([
      resumen(ANTERIOR, "Estoy terminando el secundario"),
    ]);

    render(<Autenticado alSalir={salir} />);
    await usuario.click(screen.getByRole("button", { name: /tus conversaciones/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no se pudo conectar/i);

    await usuario.click(screen.getByRole("button", { name: /reintentar/i }));

    expect(
      await screen.findByRole("button", { name: /terminando el secundario/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("se entra al perfil desde la conversación y se vuelve a la misma charla", async () => {
    // HU-13 comparte navegación con HU-12: los dos son desvíos, no pestañas.
    // Lo que se puede romper en silencio es la vuelta — que el perfil deje a la
    // persona en una conversación en blanco en vez de en la que venía.
    const usuario = userEvent.setup();
    window.sessionStorage.setItem(CLAVE, ANTERIOR);
    vi.mocked(obtenerHistorial).mockResolvedValue(
      historial(ANTERIOR, [turno(1, "usuario", "Estoy entre sistemas y diseño")]),
    );
    vi.mocked(obtenerPerfil).mockResolvedValue({
      actualizado_en: "2026-09-01T12:00:00Z",
      version_instrumento: "instrumento-v1",
      rasgos: [],
    } as never);

    render(<Autenticado alSalir={salir} />);
    await screen.findByText("Estoy entre sistemas y diseño");

    await usuario.click(screen.getByRole("button", { name: /tu perfil/i }));
    expect(
      await screen.findByRole("heading", { name: /lo que fui entendiendo/i }),
    ).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: /^volver$/i }));

    // Vuelve a la charla que venía y no a una en blanco: al desmontarse para
    // mostrar el perfil, la conversación se vuelve a montar y relee la sesión
    // guardada, igual que después de un F5. Lo que importa es que sea la misma.
    expect(screen.getByText("Estoy entre sistemas y diseño")).toBeInTheDocument();
    expect(vi.mocked(obtenerHistorial).mock.lastCall).toEqual([ANTERIOR]);
    expect(window.sessionStorage.getItem(CLAVE)).toBe(ANTERIOR);
  });
});
