/**
 * Consulta de carreras (HU-15, S3-05).
 *
 * Lo que la persona lee acá es texto del corpus institucional, no una respuesta
 * generada. Por eso cada descripción va pegada a la fuente que la respalda, y
 * una carrera sin fuente no muestra descripción: la pantalla dice que no hay
 * respaldo en lugar de mostrar algo que nadie puede rastrear.
 *
 * La ficha muestra los campos estructurados del corpus (título, duración,
 * modalidad, norma, perfil), lo que la Facultad no publica y las discrepancias
 * entre fuentes; el texto de corrido queda solo para la carrera sin campos.
 *
 * El rótulo de validación no se pliega. Mientras el corpus sea provisional, la
 * diferencia entre «lo dice una ordenanza pública» y «lo validó la Facultad»
 * tiene que verse sin desplegar nada.
 *
 * La búsqueda no muestra el puntaje: sirve para ordenar y no es un porcentaje
 * de acierto, así que un número en pantalla se leería como uno.
 */

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { buscarCarreras, listarCarreras, type Carrera } from "../api/carreras";
import { ErrorDeApi, SesionVencida } from "../api/cliente";
import { Referencia } from "../componentes/Referencia";

interface Propiedades {
  alVolver: () => void;
}

const NIVELES: Record<string, string> = {
  grado: "Carrera de grado",
  tecnicatura: "Tecnicatura",
  pregrado: "Título de pregrado",
};

export default function Carreras({ alVolver }: Propiedades) {
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [borrador, setBorrador] = useState("");
  // Lo último que se buscó. Vacío es el catálogo completo.
  const [buscado, setBuscado] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (texto: string) => {
    setCargando(true);
    setError(null);
    try {
      setCarreras(
        texto
          ? (await buscarCarreras(texto)).map((coincidencia) => coincidencia.carrera)
          : await listarCarreras(),
      );
      setBuscado(texto);
    } catch (fallo) {
      // La sesión vencida la resuelve App volviendo al ingreso.
      if (!(fallo instanceof SesionVencida)) {
        setError(
          fallo instanceof ErrorDeApi ? fallo.message : "No se pudieron traer las carreras.",
        );
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar("");
  }, [cargar]);

  function buscar(evento: FormEvent) {
    evento.preventDefault();
    void cargar(borrador.trim());
  }

  function verTodas() {
    setBorrador("");
    void cargar("");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-xl font-semibold">Carreras de la Facultad</h1>
        <button
          type="button"
          onClick={alVolver}
          className="border-input hover:bg-primary-soft inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm"
        >
          Volver
        </button>
      </div>

      <form onSubmit={buscar} className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          Contá qué te gustaría estudiar
          <input
            type="search"
            value={borrador}
            onChange={(evento) => setBorrador(evento.target.value)}
            maxLength={500}
            placeholder="Por ejemplo: algo con computadoras"
            className="border-input min-h-11 rounded-md border px-3"
          />
        </label>
        <button
          type="submit"
          disabled={cargando || borrador.trim() === ""}
          className="bg-primary text-primary-foreground inline-flex min-h-11 items-center rounded-md px-4 text-sm font-medium disabled:opacity-50"
        >
          Buscar
        </button>
      </form>

      {buscado !== "" && !cargando && error === null && carreras.length > 0 && (
        <p className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
          <span>
            Ordenadas de la más a la menos parecida a «{buscado}». No es una recomendación.
          </span>
          <button type="button" onClick={verTodas} className="text-primary underline">
            Ver todas
          </button>
        </p>
      )}

      {cargando && (
        <p aria-live="polite" className="text-muted-foreground text-sm">
          Buscando carreras…
        </p>
      )}

      {error !== null && (
        <p role="alert" className="text-destructive flex items-center gap-3 text-sm">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void cargar(buscado)}
            className="border-input hover:bg-primary-soft inline-flex min-h-11 items-center rounded-md border px-3"
          >
            Reintentar
          </button>
        </p>
      )}

      {!cargando && error === null && carreras.length === 0 && (
        <p className="text-muted-foreground text-sm">
          {buscado
            ? `No encontramos carreras con respaldo institucional para «${buscado}».`
            : "Por ahora no hay carreras para mostrar. Puede ser que el corpus institucional todavía no esté cargado, o que lo que hay esté esperando la validación de la Facultad."}
        </p>
      )}

      {!cargando && error === null && carreras.length > 0 && (
        <ul className="flex flex-col gap-4">
          {carreras.map((carrera) => (
            <li key={carrera.id}>
              <Ficha carrera={carrera} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Ficha({ carrera }: { carrera: Carrera }) {
  const conFuente = carrera.fuente.trim() !== "";
  return (
    <article className="border-border bg-surface flex flex-col gap-2 rounded-md border p-4 text-sm">
      <h2 className="text-base font-semibold">{carrera.denominacion}</h2>
      <p className="text-muted-foreground">{NIVELES[carrera.nivel] ?? carrera.nivel}</p>
      <Validacion estado={carrera.estado_validacion} />
      {conFuente ? (
        <details>
          <summary className="min-h-11 cursor-pointer py-2 font-medium">
            Qué dice la Facultad
          </summary>
          <Datos carrera={carrera} />
          <p className="mt-2">
            Fuente: <Referencia texto={carrera.fuente} />
          </p>
        </details>
      ) : (
        <p className="text-muted-foreground">
          No tenemos una fuente institucional para esta carrera, así que no mostramos su
          descripción.
        </p>
      )}
    </article>
  );
}

/** «5 años», «3.600 horas reloj», o la condición si el título no sale por duración. */
function duracionLegible(duracion: NonNullable<Carrera["duracion"]>): string | null {
  const partes = [
    duracion.anios != null && `${duracion.anios} ${duracion.anios === 1 ? "año" : "años"}`,
    duracion.horas_reloj != null && `${duracion.horas_reloj.toLocaleString("es-AR")} horas reloj`,
    duracion.condicion_de_obtencion,
  ].filter((parte): parte is string => typeof parte === "string" && parte !== "");
  return partes.length > 0 ? partes.join(" · ") : null;
}

function normaLegible(norma: NonNullable<Carrera["norma"]>): string {
  const año = norma.anio != null ? ` (${norma.anio})` : "";
  const plan = norma.plan != null && norma.plan !== "" ? `, plan ${norma.plan}` : "";
  return `${norma.ordenanza}${año}${plan}`;
}

/**
 * La ficha en campos y no de corrido: qué título da, cuánto dura, en qué
 * modalidad. Si el backend no mandó ninguno (carrera sin datos separados), se
 * muestra el texto tal como se indexó, que es lo que había.
 */
function Datos({ carrera }: { carrera: Carrera }) {
  const duracion = carrera.duracion != null ? duracionLegible(carrera.duracion) : null;
  const filas = (
    [
      ["Título que otorga", carrera.titulo_otorgado],
      ["Modalidad", carrera.modalidad],
      ["Duración", duracion],
      [
        "Título intermedio",
        carrera.titulo_intermedio != null ? carrera.titulo_intermedio.denominacion : null,
      ],
      [
        "Es el título intermedio de",
        carrera.intermedio_de != null ? carrera.intermedio_de.denominacion : null,
      ],
      ["Se dicta con", carrera.convenio],
      ["Norma", carrera.norma != null ? normaLegible(carrera.norma) : null],
    ] as [string, string | null | undefined][]
  ).filter((fila): fila is [string, string] => fila[1] != null && fila[1] !== "");
  const noPublicado = carrera.no_publicado ?? [];
  const discrepancias = carrera.discrepancias ?? [];
  const perfil = carrera.perfil_profesional?.trim() ?? "";
  const estructurada =
    filas.length > 0 || perfil !== "" || noPublicado.length > 0 || discrepancias.length > 0;

  if (!estructurada) return <p className="mt-2 whitespace-pre-wrap">{carrera.texto}</p>;

  return (
    <div className="mt-2 flex flex-col gap-3 break-words">
      {filas.length > 0 && (
        <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-[max-content_1fr]">
          {filas.map(([nombre, valor]) => (
            <div key={nombre} className="contents">
              <dt className="font-medium">{nombre}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
        </dl>
      )}

      {perfil !== "" && (
        <section>
          <h3 className="font-medium">Perfil profesional</h3>
          <p className="mt-1 whitespace-pre-wrap">{perfil}</p>
        </section>
      )}

      {discrepancias.length > 0 && (
        <section className="bg-accent-soft text-accent-foreground flex flex-col gap-2 rounded-md p-3">
          <h3 className="font-medium">Las fuentes no coinciden</h3>
          <ul className="flex flex-col gap-2">
            {discrepancias.map((d) => (
              <li key={d.campo}>
                {d.campo}: «{d.valor_adoptado}» según {d.fuente_adoptada}, y «{d.valor_alternativo}»
                según {d.fuente_alternativa}.
              </li>
            ))}
          </ul>
          <p>
            Mostramos el dato de la primera fuente. Podés confirmarlo con la Secretaría de la
            Facultad.
          </p>
        </section>
      )}

      {noPublicado.length > 0 && (
        <section>
          <h3 className="font-medium">Lo que la Facultad todavía no publica</h3>
          <ul className="mt-1 list-disc pl-5">
            {noPublicado.map((dato) => (
              <li key={dato}>{dato}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Validacion({ estado }: { estado: string }) {
  // Hoy el corpus entero es `provisional`; cuando el backend publique
  // los otros estados, cada uno lleva su frase en vez del valor crudo.
  if (estado !== "provisional") {
    return <p className="text-muted-foreground">Estado de validación: {estado}</p>;
  }
  return (
    <p className="text-muted-foreground">
      Dato <strong>provisional</strong>: sale de una fuente pública y la Facultad todavía no lo
      validó.
    </p>
  );
}
