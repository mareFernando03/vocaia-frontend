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
 * El estado de validación del corpus no se muestra en esta pantalla (decisión de
 * LV del 10/11, VOCAIA-202): el rótulo en cada ficha, y después la línea única
 * arriba, se leían como ruido. Cada ficha sigue mostrando la fuente que
 * respalda su descripción.
 *
 * La búsqueda no muestra el puntaje: sirve para ordenar y no es un porcentaje
 * de acierto, así que un número en pantalla se leería como uno.
 */

import { ChevronDown, GraduationCap, Search, TriangleAlert, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import { buscarCarreras, listarCarreras, type Carrera } from "../api/carreras";
import { ErrorDeApi, SesionVencida } from "../api/cliente";
import { AvisoDesactualizado } from "../componentes/AvisoDesactualizado";
import { Referencia } from "../componentes/Referencia";
import { Aviso } from "../componentes/ui/Aviso";
import { Boton } from "../componentes/ui/Boton";
import { BotonIcono } from "../componentes/ui/BotonIcono";
import { Cargando } from "../componentes/ui/Cargando";
import { EncabezadoPagina } from "../componentes/ui/EncabezadoPagina";
import { ErrorConReintento } from "../componentes/ui/ErrorConReintento";
import { Tarjeta } from "../componentes/ui/Tarjeta";

const NIVELES: Record<string, string> = {
  grado: "Carrera de grado",
  tecnicatura: "Tecnicatura",
  pregrado: "Título de pregrado",
};

export default function Carreras() {
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [borrador, setBorrador] = useState("");
  // Lo último que se buscó. Vacío es el catálogo completo.
  const [buscado, setBuscado] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const campo = useRef<HTMLInputElement>(null);
  // Limpiar puede pedir el catálogo mientras sigue una búsqueda en vuelo.
  // Sólo la petición más reciente puede cambiar lo que muestra la pantalla.
  const pedido = useRef(0);

  const cargar = useCallback(async (texto: string) => {
    const actual = ++pedido.current;
    setCargando(true);
    setError(null);
    try {
      const recibidas = texto
        ? (await buscarCarreras(texto)).map((coincidencia) => coincidencia.carrera)
        : await listarCarreras();
      if (actual !== pedido.current) return;
      setCarreras(recibidas);
      setBuscado(texto);
    } catch (fallo) {
      if (actual !== pedido.current) return;
      // La sesión vencida la resuelve App volviendo al ingreso.
      if (!(fallo instanceof SesionVencida)) {
        setError(
          fallo instanceof ErrorDeApi ? fallo.message : "No se pudieron traer las carreras.",
        );
      }
    } finally {
      if (actual === pedido.current) setCargando(false);
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

  // Limpiar deja el foco en el campo, listo para escribir otra cosa. Si lo
  // borrado ya se había buscado, vuelve el catálogo completo: un campo vacío
  // con resultados de una búsqueda vieja no se entiende.
  function limpiar() {
    setBorrador("");
    campo.current?.focus();
    void cargar("");
  }

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Carreras de la Facultad" />

      <form onSubmit={buscar} className="flex max-w-2xl flex-col gap-2" role="search">
        <label htmlFor="buscar-carrera" className="text-sm font-medium">
          Contá qué te gustaría estudiar
        </label>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2"
            />
            {/* Sin autocompletado: el navegador ofrecía búsquedas viejas en
                una lista propia que tapaba el resto y no seguía el tema. */}
            <input
              ref={campo}
              id="buscar-carrera"
              type="search"
              autoComplete="off"
              value={borrador}
              onChange={(evento) => setBorrador(evento.target.value)}
              maxLength={500}
              placeholder="Algo con computadoras"
              className="border-input bg-surface placeholder:text-muted-foreground shadow-tarjeta min-h-12 w-full rounded-xl border ps-11 pe-12 text-base"
            />
            {borrador !== "" && (
              <BotonIcono
                etiqueta="Borrar lo que escribiste"
                onClick={limpiar}
                className="absolute top-1/2 right-0.5 -translate-y-1/2"
              >
                <X aria-hidden="true" />
              </BotonIcono>
            )}
          </div>
          <Boton
            type="submit"
            variante="primario"
            disabled={cargando || borrador.trim() === ""}
            className="min-h-12"
          >
            Buscar
          </Boton>
        </div>
      </form>

      {buscado !== "" && !cargando && error === null && carreras.length > 0 && (
        <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 text-sm">
          <span>
            Las más parecidas a «{buscado}» primero.{" "}
            <strong className="text-foreground font-medium">No es una recomendación.</strong>
          </span>
          <Boton variante="enlace" onClick={verTodas}>
            Ver todas
          </Boton>
        </p>
      )}

      {cargando && (
        <p aria-live="polite">
          <Cargando texto="Buscando carreras…" />
        </p>
      )}

      {error !== null && (
        <ErrorConReintento alReintentar={() => void cargar(buscado)}>{error}</ErrorConReintento>
      )}

      {!cargando && error === null && carreras.length === 0 && (
        <div className="text-muted-foreground flex flex-col items-center gap-3 py-10 text-center">
          <GraduationCap aria-hidden="true" className="size-10" strokeWidth={1.5} />
          <p>
            {buscado
              ? `No encontramos carreras con respaldo institucional para «${buscado}».`
              : "Por ahora no hay carreras para mostrar: puede que todavía no estén cargadas, o que estén esperando la validación de la Facultad."}
          </p>
        </div>
      )}

      {!cargando && error === null && carreras.length > 0 && (
        // Dos columnas cuando hay ancho. `items-start`: al abrir los datos de
        // una ficha, la de al lado no se estira para acompañarla.
        <ul className="grid items-start gap-4 lg:grid-cols-2">
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
    <Tarjeta como="article" className="text-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg leading-snug font-semibold">{carrera.denominacion}</h2>
        <p className="text-muted-foreground">{NIVELES[carrera.nivel] ?? carrera.nivel}</p>
      </div>
      {conFuente ? (
        <details className="group border-border border-t pt-1">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 font-medium [&::-webkit-details-marker]:hidden">
            Datos de la carrera
            <ChevronDown
              aria-hidden="true"
              className="text-muted-foreground size-5 transition-transform group-open:rotate-180"
            />
          </summary>
          <Datos carrera={carrera} />
          <p className="text-muted-foreground mt-4">
            Fuente: <Referencia texto={carrera.fuente} />
          </p>
        </details>
      ) : (
        <p className="text-muted-foreground">
          No tenemos una fuente institucional para esta carrera, así que no mostramos su
          descripción.
        </p>
      )}
      <AvisoDesactualizado carrera={carrera.denominacion} />
    </Tarjeta>
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
  // Con apenas un dato suelto (solo lo no publicado, solo una discrepancia) la
  // ficha quedaría casi vacía: sin campos ni perfil se sigue mostrando el texto.
  const sinCuerpo = filas.length === 0 && perfil === "";

  return (
    <div className="mt-2 flex flex-col gap-4 leading-relaxed break-words">
      {sinCuerpo && <p className="whitespace-pre-wrap">{carrera.texto}</p>}

      {filas.length > 0 && (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-[minmax(9rem,max-content)_1fr] sm:gap-y-3">
          {filas.map(([nombre, valor]) => (
            <div key={nombre} className="contents">
              <dt className="text-muted-foreground mt-2 first:mt-0 sm:mt-0">{nombre}</dt>
              <dd className="font-medium">{valor}</dd>
            </div>
          ))}
        </dl>
      )}

      {perfil !== "" && (
        <section>
          <h3 className="font-semibold">Perfil profesional</h3>
          <p className="mt-1 whitespace-pre-wrap">{perfil}</p>
        </section>
      )}

      {discrepancias.length > 0 && (
        <Aviso tono="precaucion" icono={<TriangleAlert />}>
          <h3 className="font-semibold">Las fuentes no coinciden</h3>
          <ul className="flex flex-col gap-2">
            {discrepancias.map((d) => (
              <li key={d.campo}>
                {d.campo}: «{d.valor_adoptado}» según {d.fuente_adoptada}, y «{d.valor_alternativo}»
                según {d.fuente_alternativa}.
              </li>
            ))}
          </ul>
          <p>Podés confirmarlo con la Secretaría de la Facultad.</p>
        </Aviso>
      )}

      {noPublicado.length > 0 && (
        <section>
          <h3 className="font-semibold">Lo que no encontramos en las fuentes que consultamos</h3>
          <ul className="mt-1 list-disc ps-5">
            {noPublicado.map((dato) => (
              <li key={dato}>{dato}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
