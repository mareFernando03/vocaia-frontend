/**
 * Consulta de carreras (HU-15, S3-05).
 *
 * Lo que la persona lee acá es texto del corpus institucional, no una respuesta
 * generada. Por eso cada descripción va pegada a la fuente que la respalda, y
 * una carrera sin fuente no muestra descripción: la pantalla dice que no hay
 * respaldo en lugar de mostrar algo que nadie puede rastrear.
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

      {buscado !== "" && !cargando && error === null && (
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
            : "Todavía no hay información institucional de carreras cargada."}
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
          <summary className="cursor-pointer font-medium">Qué dice la Facultad</summary>
          <p className="mt-2 whitespace-pre-wrap">{carrera.texto}</p>
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

function Validacion({ estado }: { estado: string }) {
  // ponytail: hoy el corpus entero es `provisional`; cuando el backend publique
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
