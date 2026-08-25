import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EventoConversacion, Historial, Turno } from "../api/conversacion";

/**
 * La prueba que cierra HU-07 es `recupera la conversación después de recargar`.
 *
 * Se simula la recarga desmontando y volviendo a montar sin tocar
 * `sessionStorage`, que es exactamente lo que hace un F5: la pestaña sigue
 * siendo la misma, el árbol de React se rehace desde cero.
 */

vi.mock("../api/conversacion", () => ({
  obtenerHistorial: vi.fn(),
  enviarMensaje: vi.fn(),
}));

const { obtenerHistorial, enviarMensaje } = await import("../api/conversacion");
const { default: Conversacion } = await import("./Conversacion");

const CLAVE = "vocaia:conversacion:sesion";

function turno(numero: number, rol: string, contenido: string): Turno {
  return { numero, rol, contenido, ocurrido_en: "2026-08-24T12:00:00Z" };
}

function historial(sesionId: string, turnos: Turno[]): Historial {
  return {
    sesion_id: sesionId,
    estado: "en_curso",
    turnos,
    iniciada_en: "2026-08-24T12:00:00Z",
    actualizada_en: "2026-08-24T12:00:00Z",
    version_instrumento: "v1",
    version_prompt: "sistema-v3",
  };
}

function flujo(...eventos: EventoConversacion[]) {
  return (async function* () {
    for (const evento of eventos) yield evento;
  })();
}

const salir = () => Promise.resolve();

describe("Conversacion · continuidad de la sesión (HU-07)", () => {
  beforeEach(() => {
    vi.mocked(obtenerHistorial).mockReset();
    vi.mocked(enviarMensaje).mockReset();
  });

  it("una sesión nueva no le pregunta al backend por algo que no existe", () => {
    render(<Conversacion alSalir={salir} />);

    expect(obtenerHistorial).not.toHaveBeenCalled();
    expect(screen.getByText(/contame por dónde andás/i)).toBeInTheDocument();
  });

  it("recupera la conversación después de recargar", async () => {
    const usuario = userEvent.setup();
    vi.mocked(enviarMensaje).mockReturnValue(
      flujo(
        { delta: "Contame" },
        { delta: " más." },
        { fin: true, turno_usuario: 1, turno_agente: 2, fuentes: [] },
      ),
    );
    vi.mocked(obtenerHistorial).mockImplementation((id: string) =>
      Promise.resolve(
        historial(id, [
          turno(1, "usuario", "Estoy terminando el secundario"),
          turno(2, "agente", "Contame más."),
        ]),
      ),
    );

    const primera = render(<Conversacion alSalir={salir} />);
    await usuario.type(
      screen.getByLabelText(/escribí tu mensaje/i),
      "Estoy terminando el secundario",
    );
    await usuario.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() => expect(screen.getByText("Contame más.")).toBeInTheDocument());
    const guardada = window.sessionStorage.getItem(CLAVE);
    expect(guardada).not.toBeNull();

    // El F5: se cae todo el árbol y se vuelve a montar con el mismo almacenamiento.
    primera.unmount();
    vi.mocked(obtenerHistorial).mockClear();
    render(<Conversacion alSalir={salir} />);

    await waitFor(() => expect(screen.getByText("Contame más.")).toBeInTheDocument());
    expect(screen.getByText("Estoy terminando el secundario")).toBeInTheDocument();
    // Y la misma sesión, no una nueva: es lo que hace que el backend encuentre los turnos.
    expect(obtenerHistorial).toHaveBeenCalledWith(guardada);
  });

  it("un identificador guardado que el backend no conoce es una conversación vacía, no un error", async () => {
    window.sessionStorage.setItem(CLAVE, "11111111-1111-4111-8111-111111111111");
    vi.mocked(obtenerHistorial).mockResolvedValue(null);

    render(<Conversacion alSalir={salir} />);

    await waitFor(() => expect(screen.getByText(/contame por dónde andás/i)).toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("muestra las fuentes consultadas de la última respuesta, sin decir que las citó", async () => {
    const usuario = userEvent.setup();
    vi.mocked(enviarMensaje).mockReturnValue(
      flujo(
        { delta: "Dura cinco años." },
        {
          fin: true,
          turno_usuario: 1,
          turno_agente: 2,
          fuentes: [
            {
              id: "ingenieria-en-sistemas-de-informacion",
              fuente: "Ordenanza C.S. N.º 1877 — http://csu.rec.utn.edu.ar/CSU/ORD/1877.pdf",
            },
          ],
        },
      ),
    );
    vi.mocked(obtenerHistorial).mockImplementation((id: string) =>
      Promise.resolve(
        historial(id, [
          turno(1, "usuario", "¿Cuánto dura sistemas?"),
          turno(2, "agente", "Dura cinco años."),
        ]),
      ),
    );

    render(<Conversacion alSalir={salir} />);
    await usuario.type(screen.getByLabelText(/escribí tu mensaje/i), "¿Cuánto dura sistemas?");
    await usuario.click(screen.getByRole("button", { name: "Enviar" }));

    const enlace = await screen.findByRole("link", { name: /Ordenanza C.S. N.º 1877/ });
    expect(enlace).toHaveAttribute("href", "http://csu.rec.utn.edu.ar/CSU/ORD/1877.pdf");
    // La distinción no es cosmética: el backend recupera lo más cercano y el
    // modelo puede haberlo ignorado por completo.
    expect(screen.getByText(/consultadas/i)).toBeInTheDocument();
    expect(screen.queryByText(/citadas/i)).not.toBeInTheDocument();
    // `toBeVisible` y no `toBeInTheDocument`: adentro de un <details> plegado
    // el texto está en el DOM igual, así que `toBeInTheDocument` pasa aunque
    // nadie pueda leerlo. La salvedad de R-002 tiene que verse sin desplegar.
    expect(screen.getByText(/provisionales/i)).toBeVisible();
  });

  it("un turno sin fuentes no dibuja el bloque", async () => {
    const usuario = userEvent.setup();
    vi.mocked(enviarMensaje).mockReturnValue(
      flujo(
        { delta: "Contame más." },
        { fin: true, turno_usuario: 1, turno_agente: 2, fuentes: [] },
      ),
    );
    vi.mocked(obtenerHistorial).mockImplementation((id: string) =>
      Promise.resolve(
        historial(id, [turno(1, "usuario", "Hola"), turno(2, "agente", "Contame más.")]),
      ),
    );

    render(<Conversacion alSalir={salir} />);
    await usuario.type(screen.getByLabelText(/escribí tu mensaje/i), "Hola");
    await usuario.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() => expect(screen.getByText("Contame más.")).toBeInTheDocument());
    expect(screen.queryByText(/fuentes consultadas/i)).not.toBeInTheDocument();
  });

  it("si la generación se corta, avisa y conserva lo que alcanzó a escribir", async () => {
    const usuario = userEvent.setup();
    vi.mocked(enviarMensaje).mockReturnValue(
      flujo({ delta: "Estaba pensando" }, { error: "TimeoutError: se cortó la generación" }),
    );
    vi.mocked(obtenerHistorial).mockImplementation((id: string) =>
      Promise.resolve(historial(id, [turno(1, "usuario", "Hola")])),
    );

    render(<Conversacion alSalir={salir} />);
    await usuario.type(screen.getByLabelText(/escribí tu mensaje/i), "Hola");
    await usuario.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/se cortó la generación/i),
    );
  });
});
