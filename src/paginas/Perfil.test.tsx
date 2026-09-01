import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Evidencia, Objecion, Perfil as PerfilApi, Rasgo } from "../api/perfil";

/**
 * S2-11 · el perfil se entiende sin saber cómo está hecho.
 *
 * El criterio de aceptación es que una persona ajena al proyecto entienda qué
 * dice su perfil y por qué, así que la prueba central es la que busca jerga:
 * si alguien vuelve a poner «intensidad 1.4» en la pantalla, esto lo caza.
 */

vi.mock("../api/perfil", async (original) => ({
  ...(await original<typeof import("../api/perfil")>()),
  obtenerPerfil: vi.fn(),
  objetar: vi.fn(),
}));

const { obtenerPerfil, objetar } = await import("../api/perfil");
const { ErrorDeApi } = await import("../api/cliente");
const { default: Perfil } = await import("./Perfil");

function evidencia(fragmento: string, extra: Partial<Evidencia> = {}): Evidencia {
  return {
    id: crypto.randomUUID(),
    fragmento,
    sesion_id: "11111111-1111-4111-8111-111111111111",
    turno: 3,
    valencia: 2,
    confianza: "alta",
    confianza_degradada: false,
    emitida_en: "2026-08-24T12:00:00Z",
    ...extra,
  };
}

function rasgo(extra: Partial<Rasgo> = {}): Rasgo {
  return {
    dimension: "I",
    nombre: "Investigador",
    descripcion: "Curiosidad por entender cómo funcionan las cosas.",
    intensidad: 1.5,
    soporte: 3,
    unidades: 2,
    confianza: "alta",
    evidencias: [],
    objecion: null,
    ...extra,
  };
}

function objecion(extra: Partial<Objecion> = {}): Objecion {
  return {
    dimension: "I",
    motivo: "",
    version_instrumento: "instrumento-v1",
    registrada_en: "2026-08-31T09:00:00Z",
    ...extra,
  };
}

function perfil(extra: Partial<PerfilApi> = {}): PerfilApi {
  return {
    version_instrumento: "instrumento-v1",
    actualizado_en: "2026-08-30T10:00:00Z",
    publicable: true,
    sesiones: [],
    rasgos: [],
    ...extra,
  };
}

describe("Perfil · comprensible para quien no lo construyó (HU-13, S2-11)", () => {
  beforeEach(() => {
    vi.mocked(obtenerPerfil).mockReset();
    vi.mocked(objetar).mockReset();
  });

  it("no muestra ni un término del vocabulario con el que está hecho", async () => {
    vi.mocked(obtenerPerfil).mockResolvedValue(
      perfil({
        rasgos: [rasgo({ evidencias: [evidencia("Me pasé un fin de semana entero con eso.")] })],
      }),
    );

    render(<Perfil />);
    await screen.findByRole("heading", { name: /lo que fui entendiendo/i });

    // La lista es la de los nombres que el backend usa para pensar el perfil.
    // Ninguno significa nada para quien lo lee, y varios —«valencia»,
    // «psicométrico»— suenan a diagnóstico clínico, que es exactamente lo que
    // este sistema no hace.
    for (const jerga of [
      /intensidad/i,
      /soporte/i,
      /valencia/i,
      /confianza/i,
      /dimensión/i,
      /psicom/i,
      /RIASEC/i,
      /riasec/,
    ]) {
      expect(screen.queryByText(jerga)).not.toBeInTheDocument();
    }
    // Y el código de la dimensión tampoco: «I» no le dice nada a nadie.
    expect(screen.getByRole("heading", { name: "Investigador" })).toBeInTheDocument();
  });

  it("no dice «más de una vez» de algo que la persona contó una sola vez", async () => {
    // Una lectura sola y contundente alcanza para confianza alta, así que la
    // frase de respaldo no puede hablar de cantidad: la cantidad la dice la
    // línea de al lado, y las dos juntas se contradecían.
    vi.mocked(obtenerPerfil).mockResolvedValue(
      perfil({ rasgos: [rasgo({ confianza: "alta", unidades: 1, soporte: 3 })] }),
    );

    render(<Perfil />);

    expect(await screen.findByText(/sale de una sola cosa que me contaste/i)).toBeInTheDocument();
    expect(screen.queryByText(/más de una vez/i)).not.toBeInTheDocument();
  });

  it("dice en qué se basa con la cita textual de la persona", async () => {
    const usuario = userEvent.setup();
    vi.mocked(obtenerPerfil).mockResolvedValue(
      perfil({
        rasgos: [
          rasgo({ evidencias: [evidencia("Me pasé un fin de semana entero desarmando la bici.")] }),
        ],
      }),
    );

    render(<Perfil />);
    await usuario.click(await screen.findByText(/en qué me baso/i));

    // Literal y no parafraseada: lo que la persona tiene que poder reconocer
    // —o desconocer, que es lo que habilita S2-12— es algo que escribió ella.
    expect(
      screen.getByText(/Me pasé un fin de semana entero desarmando la bici\./),
    ).toBeInTheDocument();
  });

  it("una dimensión de la que no se habló no se muestra como un valor bajo", async () => {
    vi.mocked(obtenerPerfil).mockResolvedValue(
      perfil({
        rasgos: [
          rasgo(),
          rasgo({
            dimension: "R",
            nombre: "Realista",
            intensidad: 0,
            soporte: 0,
            unidades: 0,
            confianza: "insuficiente",
            evidencias: [],
          }),
        ],
      }),
    );

    render(<Perfil />);
    await screen.findByText(/de esto todavía no hablamos/i);

    // «Realista» aparece en la sección de lo no conversado, y no como una
    // tarjeta con un veredicto: afirmar «no te interesa» sobre algo que nadie
    // mencionó sería inventar el dato que falta.
    expect(screen.queryByRole("heading", { name: "Realista" })).not.toBeInTheDocument();
    expect(screen.getByText("Realista")).toBeInTheDocument();
    expect(screen.getByText(/no es que te haya salido bajo/i)).toBeInTheDocument();
  });

  it("cuando no alcanza para recomendar carreras, lo dice sin que haya que desplegar nada", async () => {
    vi.mocked(obtenerPerfil).mockResolvedValue(perfil({ publicable: false, rasgos: [rasgo()] }));

    render(<Perfil />);

    const salvedad = await screen.findByText(/para recomendarte carreras/i);
    expect(salvedad).toBeInTheDocument();
    expect(salvedad.closest("details")).toBeNull();
  });

  it("quien todavía no conversó recibe una invitación, no una pantalla vacía", async () => {
    vi.mocked(obtenerPerfil).mockResolvedValue(perfil({ actualizado_en: null, rasgos: [] }));

    render(<Perfil />);

    expect(await screen.findByText(/conversá un rato y volvé/i)).toBeInTheDocument();
  });

  it("si el backend falla, se puede reintentar sin recargar la página", async () => {
    const usuario = userEvent.setup();
    vi.mocked(obtenerPerfil)
      .mockRejectedValueOnce(new ErrorDeApi(500, "El servidor respondió 500."))
      .mockResolvedValueOnce(perfil({ rasgos: [rasgo()] }));

    render(<Perfil />);
    await usuario.click(await screen.findByRole("button", { name: /reintentar/i }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Investigador" })).toBeInTheDocument(),
    );
  });
});

describe("Perfil · objetar una inferencia que no me representa (HU-13, S2-12)", () => {
  beforeEach(() => {
    vi.mocked(obtenerPerfil).mockReset();
    vi.mocked(objetar).mockReset();
  });

  it("registra la objeción contra la dimensión que se está leyendo", async () => {
    const usuario = userEvent.setup();
    vi.mocked(obtenerPerfil).mockResolvedValue(perfil({ rasgos: [rasgo()] }));
    vi.mocked(objetar).mockResolvedValue(objecion());

    render(<Perfil />);
    await usuario.click(await screen.findByRole("button", { name: /no me representa/i }));
    await usuario.type(screen.getByLabelText(/por qué/i), "lo estudio por mi viejo");
    await usuario.click(screen.getByRole("button", { name: /registrar/i }));

    // Contra «I», que es la dimensión de la tarjeta: el desacuerdo es con algo
    // concreto que la persona está leyendo, no con el perfil en general.
    await waitFor(() => expect(objetar).toHaveBeenCalledWith("I", "lo estudio por mi viejo"));
  });

  it("el motivo es opcional: objetar sin explicar sigue siendo objetar", async () => {
    const usuario = userEvent.setup();
    vi.mocked(obtenerPerfil).mockResolvedValue(perfil({ rasgos: [rasgo()] }));
    vi.mocked(objetar).mockResolvedValue(objecion());

    render(<Perfil />);
    await usuario.click(await screen.findByRole("button", { name: /no me representa/i }));
    await usuario.click(screen.getByRole("button", { name: /registrar/i }));

    await waitFor(() => expect(objetar).toHaveBeenCalledWith("I", ""));
  });

  it("la objeción queda a la vista al volver a traer el perfil", async () => {
    const usuario = userEvent.setup();
    vi.mocked(obtenerPerfil)
      .mockResolvedValueOnce(perfil({ rasgos: [rasgo()] }))
      .mockResolvedValueOnce(
        perfil({ rasgos: [rasgo({ objecion: objecion({ motivo: "lo hago por obligación" }) })] }),
      );
    vi.mocked(objetar).mockResolvedValue(objecion({ motivo: "lo hago por obligación" }));

    render(<Perfil />);
    await usuario.click(await screen.findByRole("button", { name: /no me representa/i }));
    await usuario.click(screen.getByRole("button", { name: /registrar/i }));

    // Recuperable, que es el criterio de aceptación: lo que se muestra es lo
    // que quedó guardado del otro lado, no lo que acabamos de mandar.
    expect(await screen.findByText(/marcaste que esto no te representa/i)).toBeInTheDocument();
    expect(screen.getByText(/lo hago por obligación/)).toBeInTheDocument();
  });

  it("objetar no tacha el rasgo ni esconde las citas que lo sostienen", async () => {
    vi.mocked(obtenerPerfil).mockResolvedValue(
      perfil({
        rasgos: [
          rasgo({
            objecion: objecion(),
            evidencias: [evidencia("Me pasé el finde entero leyendo sobre eso.")],
          }),
        ],
      }),
    );

    render(<Perfil />);
    await screen.findByText(/marcaste que esto no te representa/i);

    // El desacuerdo entre lo que el sistema infiere y lo que la persona
    // reconoce es el dato que hay que conservar. Tachar el rasgo lo borraría.
    expect(screen.getByRole("heading", { name: "Investigador" })).toBeInTheDocument();
    expect(
      screen.getByText(/volvió a aparecer|ejemplos concretos|mencionaste poco/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/en qué me baso/i)).toBeInTheDocument();
  });

  it("si el registro falla, lo dice y no finge que quedó guardado", async () => {
    const usuario = userEvent.setup();
    vi.mocked(obtenerPerfil).mockResolvedValue(perfil({ rasgos: [rasgo()] }));
    vi.mocked(objetar).mockRejectedValue(new ErrorDeApi(500, "El servidor respondió 500."));

    render(<Perfil />);
    await usuario.click(await screen.findByRole("button", { name: /no me representa/i }));
    await usuario.click(screen.getByRole("button", { name: /registrar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("El servidor respondió 500.");
    expect(screen.queryByText(/marcaste que esto no te representa/i)).not.toBeInTheDocument();
  });

  it("una dimensión ya objetada no vuelve a ofrecer el botón", async () => {
    vi.mocked(obtenerPerfil).mockResolvedValue(
      perfil({ rasgos: [rasgo({ objecion: objecion() })] }),
    );

    render(<Perfil />);
    await screen.findByText(/marcaste que esto no te representa/i);

    expect(screen.queryByRole("button", { name: /no me representa/i })).not.toBeInTheDocument();
  });
});
