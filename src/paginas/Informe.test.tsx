import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CarreraInforme, Habilitante, Informe as DatosInforme } from "../api/informe";

/**
 * S4-04 · lo que la persona se lleva al cerrar: cada carrera con su porqué y
 * sus fuentes, lo que contó, los habilitantes rotulados según estén o no
 * verificados, y un informe vacío que dice por qué en vez de fallar.
 */

vi.mock("../api/informe", () => ({ obtenerInforme: vi.fn() }));
vi.mock("../api/conversacion", () => ({ listarSesiones: vi.fn() }));

const { obtenerInforme } = await import("../api/informe");
const { listarSesiones } = await import("../api/conversacion");
const { ErrorDeApi } = await import("../api/cliente");
const { default: Informe } = await import("./Informe");

const SESION = "11111111-1111-4111-8111-111111111111";

function carrera(extra: Partial<CarreraInforme> = {}): CarreraInforme {
  return {
    carrera: "ingenieria-en-sistemas-de-informacion",
    titulo: "Ingeniería en Sistemas de Información",
    justificacion: "Te entusiasma resolver problemas con computadoras.",
    puntaje: 0.8,
    fuentes: [
      {
        id: "isi-perfil",
        texto: "El ingeniero en sistemas diseña sistemas de información.",
        fuente: "Ordenanza C.S. N.º 1877 — https://utn.edu.ar/ord-1877",
        estado_validacion: "provisional",
      },
    ],
    habilitantes: null,
    ...extra,
  };
}

function informe(extra: Partial<DatosInforme> = {}): DatosInforme {
  return {
    formato: 1,
    sesion_id: SESION,
    generado_en: "2026-09-25T12:00:00Z",
    publicable: true,
    version_instrumento: "instrumento-v3",
    perfil_actualizado_en: "2026-09-25T12:00:00Z",
    evidencia: [
      {
        dimension: "I",
        nombre: "Investigar y resolver",
        confianza: "alta",
        intensidad: 1.5,
        citas: [
          {
            evidencia_id: "e1",
            sesion_id: SESION,
            turno: 3,
            texto: "me encanta desarmar programas para ver cómo andan",
            valencia: 2,
          },
        ],
      },
    ],
    recomendaciones: [carrera()],
    notas: [],
    ...extra,
  };
}

function habilitante(extra: Partial<Habilitante> = {}): Habilitante {
  return {
    id: "progresar",
    denominacion: "Beca Progresar",
    organismo: "Ministerio de Capital Humano",
    vigencia_confirmada: true,
    aplicabilidad_confirmada: true,
    fuentes: [],
    ...extra,
  };
}

describe("Informe", () => {
  beforeEach(() => vi.mocked(obtenerInforme).mockReset());

  it("muestra cada carrera con su porqué, sus fuentes y lo que contó la persona", async () => {
    vi.mocked(obtenerInforme).mockResolvedValue(informe());
    render(<Informe sesionId={SESION} alVolver={() => {}} />);

    expect(
      await screen.findByRole("heading", { name: "Ingeniería en Sistemas de Información" }),
    ).toBeInTheDocument();
    expect(obtenerInforme).toHaveBeenCalledWith(SESION);
    expect(screen.getByText(/resolver problemas con computadoras/)).toBeInTheDocument();
    expect(screen.getByText(/diseña sistemas de información/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ordenanza C.S. N.º 1877" })).toHaveAttribute(
      "href",
      "https://utn.edu.ar/ord-1877",
    );
    expect(screen.getByText(/la información de la facultad es/i)).toHaveTextContent("provisional");
    expect(screen.getByRole("heading", { name: "Lo que contaste" })).toBeInTheDocument();
    expect(screen.getByText(/desarmar programas/)).toBeInTheDocument();
    // El puntaje ordena, no se muestra.
    expect(screen.queryByText(/0[.,]8/)).not.toBeInTheDocument();
  });

  it("el botón de la encuesta lleva a la página con ?encuesta, que pide entrar con Google", async () => {
    vi.mocked(obtenerInforme).mockResolvedValue(informe());
    render(<Informe sesionId={SESION} alVolver={() => {}} />);

    expect(await screen.findByRole("link", { name: "Contanos cómo te fue" })).toHaveAttribute(
      "href",
      "https://voca-ia-survey.lovable.app/?encuesta",
    );
  });

  it("debajo del título de las carreras dice por qué salen esas", async () => {
    vi.mocked(obtenerInforme).mockResolvedValue(informe());
    render(<Informe sesionId={SESION} alVolver={() => {}} />);

    await screen.findByRole("heading", { name: /carreras que te sugerimos/i });
    expect(
      screen.getByText("Las elegimos por los intereses que mostraste en todas tus charlas."),
    ).toBeVisible();
  });

  it("al lado de cada carrera dice con quién de la Facultad hablar", async () => {
    vi.mocked(obtenerInforme).mockResolvedValue(
      informe({
        recomendaciones: [
          carrera({
            derivacion: {
              carrera: "ingenieria-en-sistemas-de-informacion",
              disponible: true,
              contacto: {
                area: "Secretaría de Coordinación y Políticas Universitarias",
                correo: "secretaria@ejemplo.edu.ar",
                telefono: null,
                whatsapp: "+54 9 342 000-0000",
              },
            },
          }),
        ],
      }),
    );
    render(<Informe sesionId={SESION} alVolver={() => {}} />);

    expect(await screen.findByRole("heading", { name: "Con quién hablar" })).toBeInTheDocument();
    expect(screen.getByText(/Secretaría de Coordinación/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "secretaria@ejemplo.edu.ar" })).toHaveAttribute(
      "href",
      "mailto:secretaria@ejemplo.edu.ar",
    );
    expect(screen.getByRole("link", { name: "+54 9 342 000-0000" })).toHaveAttribute(
      "href",
      "https://wa.me/5493420000000",
    );
    expect(screen.queryByText(/Teléfono:/)).toBeNull();
  });

  it("si el contacto no está validado lo dice y no muestra ninguno", async () => {
    vi.mocked(obtenerInforme).mockResolvedValue(
      informe({
        recomendaciones: [
          carrera({
            derivacion: {
              carrera: "ingenieria-en-sistemas-de-informacion",
              disponible: false,
              contacto: null,
            },
          }),
        ],
      }),
    );
    render(<Informe sesionId={SESION} alVolver={() => {}} />);

    expect(await screen.findByText(/todavía no tenemos un contacto/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /@/ })).toBeNull();
  });

  it("un informe sin carreras muestra la nota del backend y no un error", async () => {
    vi.mocked(obtenerInforme).mockResolvedValue(
      informe({
        publicable: false,
        recomendaciones: [],
        evidencia: [],
        notas: ["Todavía no conversamos lo suficiente para sugerirte carreras."],
      }),
    );
    render(<Informe sesionId={SESION} alVolver={() => {}} />);

    expect(await screen.findByText(/no conversamos lo suficiente/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /carreras que te sugerimos/i })).toBeNull();
  });

  it("rotula distinto los habilitantes verificados de los que no, y dice qué falta confirmar", async () => {
    vi.mocked(obtenerInforme).mockResolvedValue(
      informe({
        recomendaciones: [
          carrera({
            habilitantes: {
              por_restriccion: [
                {
                  restriccion: "economica",
                  citas: [],
                  evidencias: [],
                  verificados: [habilitante()],
                  no_verificados: [
                    habilitante({
                      id: "belgrano",
                      denominacion: "Becas Belgrano",
                      aplicabilidad_confirmada: false,
                    }),
                  ],
                },
              ],
              alternativas: [],
            },
          }),
        ],
      }),
    );
    render(<Informe sesionId={SESION} alVolver={() => {}} />);

    const seccion = (await screen.findByRole("heading", { name: /si hay algo que te frena/i }))
      .parentElement!;
    expect(within(seccion).getByText(/lo que te frena es la plata/i)).toBeInTheDocument();
    expect(within(seccion).getByText("Beca Progresar").closest("li")).toHaveTextContent(
      /^Verificado:/,
    );
    const noVerificado = within(seccion).getByText("Becas Belgrano").closest("li")!;
    expect(noVerificado).toHaveTextContent(/^Sin verificar:/);
    expect(noVerificado).toHaveTextContent(/no dice si alcanza a esta carrera/);
  });

  it("cada restricción dice de dónde salió, con lo que la persona escribió (P-10)", async () => {
    // Desde P-11 la restricción no va en «En qué me baso»: sin la cita, el
    // habilitante aparecería sin que se entienda por qué se lo ofrece.
    vi.mocked(obtenerInforme).mockResolvedValue(
      informe({
        recomendaciones: [
          carrera({
            habilitantes: {
              por_restriccion: [
                {
                  restriccion: "economica",
                  citas: ["no sé si mi familia puede pagarme el viaje"],
                  evidencias: ["5b1c7f3e-0000-4000-8000-000000000001"],
                  verificados: [habilitante()],
                  no_verificados: [],
                },
              ],
              alternativas: [],
            },
          }),
        ],
      }),
    );
    render(<Informe sesionId={SESION} alVolver={() => {}} />);

    const seccion = (await screen.findByRole("heading", { name: /si hay algo que te frena/i }))
      .parentElement!;
    expect(within(seccion).getByText(/Lo contaste así/)).toHaveTextContent(
      "Lo contaste así: «no sé si mi familia puede pagarme el viaje»",
    );
  });

  it("sin habilitantes omite la sección, y si el backend explica por qué, muestra la nota", async () => {
    vi.mocked(obtenerInforme).mockResolvedValue(
      informe({
        recomendaciones: [
          carrera({ habilitantes: { por_restriccion: [], alternativas: [] } }),
          carrera({
            carrera: "lic-en-administracion",
            titulo: "Licenciatura en Administración",
            habilitantes: {
              por_restriccion: [],
              alternativas: [],
              nota: "Todavía no podemos mostrar los habilitantes de esta carrera.",
            },
          }),
        ],
      }),
    );
    render(<Informe sesionId={SESION} alVolver={() => {}} />);

    // La nota va una sola vez al pie y no debajo de cada carrera (prueba del
    // piloto): sin habilitantes que mostrar, ninguna carrera tiene la sección.
    expect(
      await screen.findByText(/todavía no podemos mostrar los habilitantes/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /si hay algo que te frena/i })).toBeNull();
  });

  it("una restricción que no conoce lleva un título genérico y no nombra el tipo", async () => {
    // El backend ya no deja que exista, pero si llegara no puede imprimirse:
    // es una categoría sensible. La impresión usa el mismo DOM, así que mirar
    // el texto de la página entera cubre pantalla y PDF.
    vi.mocked(obtenerInforme).mockResolvedValue(
      informe({
        recomendaciones: [
          carrera({
            habilitantes: {
              por_restriccion: [
                {
                  restriccion: "discapacidad",
                  citas: [],
                  evidencias: [],
                  verificados: [habilitante()],
                  no_verificados: [],
                },
              ],
              alternativas: [],
            },
          }),
        ],
      }),
    );
    render(<Informe sesionId={SESION} alVolver={() => {}} />);

    expect(
      await screen.findByRole("heading", { name: "Otras circunstancias que mencionaste" }),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/discapacidad/i);
  });

  it("el botón de descarga abre el diálogo de impresión", async () => {
    vi.mocked(obtenerInforme).mockResolvedValue(informe());
    const imprimir = vi.spyOn(window, "print").mockImplementation(() => {});
    const usuario = userEvent.setup();
    render(<Informe sesionId={SESION} alVolver={() => {}} />);

    await usuario.click(await screen.findByRole("button", { name: /descargar en pdf/i }));

    expect(imprimir).toHaveBeenCalledOnce();
    imprimir.mockRestore();
  });

  it("recién cerrada, espera a que el informe se arme sin mostrar un error", async () => {
    // El informe se arma después de la última respuesta: tocar «Ver tu informe»
    // enseguida da un 409 con Retry-After, que es un «todavía», no un «no».
    vi.mocked(obtenerInforme)
      .mockRejectedValueOnce(
        new ErrorDeApi(409, "La conversación cerró y el informe se está armando.", 0.01),
      )
      .mockResolvedValueOnce(informe());
    render(<Informe sesionId={SESION} alVolver={() => {}} />);

    expect(await screen.findByText(/se está armando con lo último/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Ingeniería en Sistemas de Información" }),
    ).toBeInTheDocument();
    expect(obtenerInforme).toHaveBeenCalledTimes(2);
  });

  it("si se agota la espera, dice que vuelva más tarde sin mostrarlo como error", async () => {
    vi.mocked(obtenerInforme).mockRejectedValue(
      new ErrorDeApi(409, "La conversación cerró y el informe se está armando.", 0.01),
    );
    const usuario = userEvent.setup();
    render(<Informe sesionId={SESION} alVolver={() => {}} />);

    expect(
      await screen.findByText(/todavía se está preparando/i, undefined, { timeout: 3000 }),
    ).toHaveTextContent("Tus conversaciones");
    // El primer pedido más los dieciocho reintentos.
    expect(obtenerInforme).toHaveBeenCalledTimes(19);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/el informe se está armando/i)).not.toBeInTheDocument();

    vi.mocked(obtenerInforme).mockResolvedValue(informe());
    await usuario.click(screen.getByRole("button", { name: /volver a intentar/i }));
    expect(
      await screen.findByRole("heading", { name: "Ingeniería en Sistemas de Información" }),
    ).toBeInTheDocument();
  });

  it("una sesión ajena o inexistente muestra el error del backend y deja reintentar", async () => {
    vi.mocked(obtenerInforme)
      .mockRejectedValueOnce(new ErrorDeApi(404, "No existe esa sesión."))
      .mockResolvedValueOnce(informe());
    const usuario = userEvent.setup();
    render(<Informe sesionId={SESION} alVolver={() => {}} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("No existe esa sesión.");
    expect(screen.queryByRole("button", { name: /descargar/i })).not.toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: /reintentar/i }));
    expect(
      await screen.findByRole("heading", { name: "Ingeniería en Sistemas de Información" }),
    ).toBeInTheDocument();
  });
});

describe("Informe · orden de lectura", () => {
  it("va de las carreras a lo que frena, a lo que contó, a lo plegado y a con quién hablar", async () => {
    vi.mocked(obtenerInforme).mockResolvedValue(
      informe({
        recomendaciones: [
          carrera({
            habilitantes: {
              por_restriccion: [
                {
                  restriccion: "economica",
                  citas: [],
                  evidencias: [],
                  verificados: [habilitante()],
                  no_verificados: [],
                },
              ],
              alternativas: [],
            },
            derivacion: {
              carrera: "ingenieria-en-sistemas-de-informacion",
              disponible: false,
              contacto: null,
            },
          }),
        ],
      }),
    );
    render(<Informe sesionId={SESION} alVolver={() => {}} />);

    await screen.findByRole("heading", { name: "Con quién hablar" });
    const titulos = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(titulos).toEqual([
      "Carreras que te sugerimos",
      "Si hay algo que te frena",
      "Lo que contaste",
      "Para leer con más calma",
      "Con quién hablar",
    ]);
  });

  it("la ficha de la Facultad y sus fuentes quedan plegadas, y se abren al tocar el resumen", async () => {
    vi.mocked(obtenerInforme).mockResolvedValue(informe());
    const usuario = userEvent.setup();
    render(<Informe sesionId={SESION} alVolver={() => {}} />);

    const resumen = await screen.findByText(/^Datos de la carrera: Ingeniería/);
    const ficha = resumen.closest("details")!;
    expect(ficha).not.toHaveAttribute("open");

    await usuario.click(resumen);
    expect(ficha).toHaveAttribute("open");
  });

  it("con carreras, las notas del informe se leen sin abrir nada", async () => {
    const nota = "Consultalo con la Facultad antes de decidir.";
    vi.mocked(obtenerInforme).mockResolvedValue(informe({ notas: [nota] }));
    render(<Informe sesionId={SESION} alVolver={() => {}} />);

    await screen.findByRole("heading", { name: "Antes de decidir, tené en cuenta" });
    expect(screen.getByText(nota).closest("details")).toBeNull();
  });

  it("el dato provisional y el perfil parcial se leen sin abrir nada", async () => {
    vi.mocked(obtenerInforme).mockResolvedValue(informe({ publicable: false }));
    render(<Informe sesionId={SESION} alVolver={() => {}} />);

    const provisional = await screen.findByText(/la información de la facultad es/i);
    const parcial = screen.getByText(/tu perfil es/i);
    expect(provisional.closest("details")).toBeNull();
    expect(parcial.closest("details")).toBeNull();
    expect(parcial).toHaveTextContent("parcial");
  });

  it("al imprimir abre los plegados y después cierra los que abrió", async () => {
    vi.mocked(obtenerInforme).mockResolvedValue(informe());
    render(<Informe sesionId={SESION} alVolver={() => {}} />);
    const ficha = (await screen.findByText(/^Datos de la carrera: Ingeniería/)).closest("details")!;

    window.dispatchEvent(new Event("beforeprint"));
    expect(ficha).toHaveAttribute("open");
    window.dispatchEvent(new Event("afterprint"));
    expect(ficha).not.toHaveAttribute("open");
  });

  it("no usa vocabulario interno", async () => {
    vi.mocked(obtenerInforme).mockResolvedValue(informe());
    render(<Informe sesionId={SESION} alVolver={() => {}} />);
    await screen.findByRole("heading", { name: "Lo que contaste" });

    expect(document.body.textContent).not.toMatch(
      /corpus|dimensi[oó]n|valencia|isi-perfil|instrumento-v3/i,
    );
  });
});

describe("Informe · valencia de las citas", () => {
  async function conCita(valencia: number) {
    const base = informe();
    vi.mocked(obtenerInforme).mockResolvedValue({
      ...base,
      evidencia: [
        {
          ...base.evidencia[0],
          citas: [{ ...base.evidencia[0].citas[0], texto: "no fue por arte", valencia }],
        },
      ],
    });
    render(<Informe sesionId={SESION} alVolver={() => {}} />);
    await screen.findByText(/no fue por arte/);
  }

  it("un rechazo explícito (−2) lo dice", async () => {
    await conCita(-2);
    expect(screen.getByText("Lo dijiste como algo que no te gusta.")).toBeInTheDocument();
  });

  it("una aclaración (−1) muestra solo la cita, sin rotularla como rechazo", async () => {
    await conCita(-1);
    expect(screen.queryByText(/no te gusta/)).toBeNull();
  });
});

describe("Informe · citas de otra conversación (recorrido local del 27/10)", () => {
  it("dice de qué conversación es una cita que no es de esta, por cómo empezó y no por la fecha", async () => {
    const otra = "22222222-2222-4222-8222-222222222222";
    vi.mocked(listarSesiones).mockResolvedValue([
      {
        sesion_id: otra,
        estado: "cerrada",
        iniciada_en: "2026-10-27T13:00:00Z",
        actualizada_en: "2026-10-27T13:18:00Z",
        cantidad_turnos: 37,
        vista_previa: "Estoy en primer año, estoy estudiando ingenieria electronica",
        tiene_informe: true,
      },
    ] as never);
    const base = informe();
    vi.mocked(obtenerInforme).mockResolvedValue({
      ...base,
      evidencia: [
        {
          ...base.evidencia[0],
          citas: [
            {
              evidencia_id: "e9",
              sesion_id: otra,
              turno: 18,
              texto: "me gusta armar plaquetas",
              valencia: 2,
            },
            ...base.evidencia[0].citas,
          ],
        },
      ],
    });
    render(<Informe sesionId={SESION} alVolver={() => {}} />);

    expect(
      await screen.findByText(
        "Lo contaste en otra conversación, la que empezaste con «Estoy en primer año, estoy estudiando ingenieria electronica».",
      ),
    ).toBeInTheDocument();
    // La cita de esta conversación no lleva la aclaración.
    expect(screen.getAllByText(/Lo contaste en otra conversación/)).toHaveLength(1);
  });
});
