/**
 * El informe del cierre de una sesión (HU-16, S4-04).
 *
 * Es lo que la persona se lleva: por eso se descarga, y por eso el orden es el
 * de alguien que lo lee sin haber estado en la conversación. Primero las
 * carreras, que es lo que vino a buscar; en cada una, por qué, qué dice la
 * Facultad y qué hay si algo la frena. Después lo que contó, que es el
 * respaldo de todo lo anterior. Al pie, con qué versión se armó, para que el
 * PDF quede fechado.
 *
 * Lo que contó va en una sección propia y no dentro de cada carrera porque el
 * contrato todavía no dice qué citas sostienen cuál: la evidencia llega para el
 * informe entero. Cuando el backend la ate a la carrera, se mueve adentro.
 *
 * **No usa `Trazabilidad`.** Ese componente pide al backend la traza de una
 * respuesta del agente, turno por turno. El informe ya trae, copiado al cierre,
 * lo que la persona dijo y los fragmentos del corpus que se citaron: pedir las
 * trazas sería reconstruir algo que ya está, con un pedido por respuesta, y
 * además con los datos de hoy y no con los del cierre, que es lo que el informe
 * fija. Las fuentes sí se muestran con `Referencia`, igual que en todo el resto.
 *
 * El puntaje no se muestra por lo mismo que en la búsqueda de carreras: ordena,
 * pero en pantalla se leería como un porcentaje de acierto.
 */

import { useCallback, useEffect, useState } from "react";

import { describir, ErrorDeApi } from "../api/cliente";
import {
  obtenerInforme,
  type CarreraInforme,
  type EvidenciaInforme,
  type Habilitante,
  type Habilitantes,
  type Informe as DatosInforme,
} from "../api/informe";
import { Referencia } from "../componentes/Referencia";
import { comoTeCae } from "../contenido/como-te-cae";

interface Propiedades {
  sesionId: string;
  alVolver: () => void;
}

const BOTON =
  "border-input hover:bg-primary-soft inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm";

// ponytail: un minuto de espera como tope; si el armado se cae antes de medir el
// cierre, el backend contesta «se está armando» para siempre.
const INTENTOS_MIENTRAS_SE_ARMA = 12;

interface Espera {
  segundos: number;
  intento: number;
}

export default function Informe({ sesionId, alVolver }: Propiedades) {
  const [informe, setInforme] = useState<DatosInforme | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Un objeto nuevo por cada 409, aunque diga los mismos segundos: es lo que
  // hace que el efecto de abajo vuelva a programar el pedido.
  const [espera, setEspera] = useState<Espera | null>(null);

  const cargar = useCallback(
    async (intento = 0) => {
      setError(null);
      try {
        setInforme(await obtenerInforme(sesionId));
        setEspera(null);
      } catch (fallo) {
        // Recién cerrada, el informe se arma después de la última respuesta:
        // es una espera, no un error. Sólo ese 409 trae `Retry-After`; el de
        // una sesión que no cerró, y el 404 de una ajena, sí son un error y
        // traen un texto escrito para la persona.
        if (
          fallo instanceof ErrorDeApi &&
          fallo.reintentarEn !== null &&
          intento < INTENTOS_MIENTRAS_SE_ARMA
        ) {
          setEspera({ segundos: fallo.reintentarEn, intento: intento + 1 });
          return;
        }
        setEspera(null);
        setError(describir(fallo));
      }
    },
    [sesionId],
  );

  useEffect(() => void cargar(), [cargar]);

  useEffect(() => {
    if (espera === null) return;
    const temporizador = window.setTimeout(
      () => void cargar(espera.intento),
      espera.segundos * 1000,
    );
    return () => window.clearTimeout(temporizador);
  }, [espera, cargar]);

  return (
    <article className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-xl font-semibold">Tu informe</h1>
        <div className="flex flex-wrap gap-3 print:hidden">
          {informe !== null && (
            <button type="button" onClick={() => window.print()} className={BOTON}>
              Descargar en PDF
            </button>
          )}
          <button type="button" onClick={alVolver} className={BOTON}>
            Volver
          </button>
        </div>
      </div>

      {/* Siempre presente, para que el cambio de «buscando» a «se está
          armando» se anuncie. */}
      <p role="status" className="text-muted-foreground text-sm empty:hidden">
        {informe === null &&
          error === null &&
          (espera === null
            ? "Buscando tu informe…"
            : "Tu informe se está armando con lo último que contaste. Tarda unos segundos…")}
      </p>

      {error !== null && (
        <p role="alert" className="text-destructive flex items-center gap-3 text-sm">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void cargar()}
            className="border-input hover:bg-primary-soft inline-flex min-h-11 items-center rounded-md border px-3"
          >
            Reintentar
          </button>
        </p>
      )}

      {informe !== null && <Contenido informe={informe} />}
    </article>
  );
}

function Contenido({ informe }: { informe: DatosInforme }) {
  const provisional = informe.recomendaciones.some((carrera) =>
    carrera.fuentes.some((fuente) => fuente.estado_validacion === "provisional"),
  );

  return (
    <>
      {/* La franja de divulgación de `App` no sale en el PDF, y el PDF es
          justamente lo que circula sin la pantalla al lado. */}
      <div className="flex flex-col gap-1 text-sm">
        <p className="text-muted-foreground">
          Armado el {FECHA_LARGA.format(new Date(informe.generado_en))}.
        </p>
        <p>
          Lo armó una <strong>inteligencia artificial</strong> a partir de tu conversación. No
          reemplaza a un orientador vocacional, y puede equivocarse: antes de decidir, verificá con
          la Facultad lo que dice sobre cada carrera.
        </p>
        {provisional && (
          <p className="text-muted-foreground">
            La información de la Facultad es <strong>provisional</strong>: sale de fuentes públicas
            y todavía no la validó.
          </p>
        )}
      </div>

      {/* Sin carreras no es un error: las notas dicen por qué, y es lo que se
          muestra en lugar de las carreras, no un aviso encima de nada. */}
      {informe.notas.length > 0 && (
        <div className="bg-accent-soft text-accent-foreground flex flex-col gap-1 rounded-md p-3 text-sm">
          {informe.notas.map((nota) => (
            <p key={nota}>{nota}</p>
          ))}
        </div>
      )}

      {informe.recomendaciones.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Carreras que te sugerimos</h2>
          {informe.recomendaciones.map((carrera) => (
            <Carrera key={carrera.carrera} carrera={carrera} />
          ))}
        </section>
      )}

      {informe.evidencia.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Lo que contaste</h2>
          <p className="text-muted-foreground text-sm">
            Tus palabras, tal como las escribiste, agrupadas por el interés que muestran. Es de
            donde sale todo lo anterior.
          </p>
          {informe.evidencia.map((dimension) => (
            <Dimension key={dimension.dimension} dimension={dimension} />
          ))}
        </section>
      )}

      <p className="text-muted-foreground border-border border-t pt-3 text-xs">
        {/* Para quien lo lea después —el asesor, una medición de
            concordancia—: con qué reglas se armó. */}
        Armado con la versión {informe.version_instrumento} de las reglas de VocaIA.
        {informe.perfil_actualizado_en !== null &&
          ` Perfil calculado el ${FECHA_LARGA.format(new Date(informe.perfil_actualizado_en))}.`}
      </p>
    </>
  );
}

function Carrera({ carrera }: { carrera: CarreraInforme }) {
  return (
    <article className="border-border bg-surface flex flex-col gap-3 rounded-md border p-4 text-sm print:border-0 print:p-0">
      <h3 className="text-base font-semibold">{carrera.titulo}</h3>
      <p className="whitespace-pre-wrap">{carrera.justificacion}</p>

      {carrera.fuentes.length > 0 && (
        <div>
          <h4 className="font-medium">Qué dice la Facultad</h4>
          <ul className="mt-2 flex flex-col gap-3">
            {carrera.fuentes.map((fuente) => (
              <li key={fuente.id} className="break-inside-avoid">
                <blockquote className="border-accent-strong border-l-4 pl-3 whitespace-pre-wrap">
                  {fuente.texto}
                </blockquote>
                <p className="mt-1">
                  Fuente: <Referencia texto={fuente.fuente} />
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {carrera.habilitantes != null && <SiAlgoTeFrena habilitantes={carrera.habilitantes} />}
    </article>
  );
}

const RESTRICCIONES: Record<string, string> = {
  economica: "Si lo que te frena es la plata",
  geografica: "Si lo que te frena es la distancia",
  laboral: "Si lo que te frena es el trabajo",
  academica: "Si lo que te frena es el nivel académico",
  familiar: "Si lo que te frena es la situación familiar",
  discapacidad: "Si lo que te frena es una discapacidad",
};

function SiAlgoTeFrena({ habilitantes }: { habilitantes: Habilitantes }) {
  const { por_restriccion, alternativas, nota } = habilitantes;
  // Sin nada que mostrar y sin nota, la sección no existe: un título con nada
  // abajo se lee como «no cargó».
  if (por_restriccion.length === 0 && alternativas.length === 0 && nota == null) return null;

  return (
    <div className="flex flex-col gap-3">
      <h4 className="font-medium">Si hay algo que te frena</h4>
      {nota != null && <p className="text-muted-foreground">{nota}</p>}

      {por_restriccion.map((grupo) => (
        <div key={grupo.restriccion} className="flex flex-col gap-2">
          <h5 className="font-medium">
            {RESTRICCIONES[grupo.restriccion] ?? `Restricción: ${grupo.restriccion}`}
          </h5>
          {grupo.verificados.length + grupo.no_verificados.length > 0 && (
            <ul className="flex flex-col gap-2">
              {grupo.verificados.map((habilitante) => (
                <Apoyo key={habilitante.id} habilitante={habilitante} verificado />
              ))}
              {grupo.no_verificados.map((habilitante) => (
                <Apoyo key={habilitante.id} habilitante={habilitante} verificado={false} />
              ))}
            </ul>
          )}
          {grupo.sin_habilitante != null && (
            <p className="text-muted-foreground">{grupo.sin_habilitante}</p>
          )}
        </div>
      ))}

      {alternativas.length > 0 && (
        <div className="flex flex-col gap-2">
          <h5 className="font-medium">Carreras cercanas</h5>
          <ul className="flex flex-col gap-2">
            {alternativas.map((alternativa) => (
              <li key={alternativa.carrera} className="break-inside-avoid">
                <p className="font-medium">{alternativa.titulo}</p>
                <p>{alternativa.justificacion}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Apoyo({ habilitante, verificado }: { habilitante: Habilitante; verificado: boolean }) {
  // El rótulo es texto y va primero, como en la pantalla de carreras: el color
  // solo no le llega a quien no lo ve, ni a una impresión en blanco y negro.
  return (
    <li
      className={`break-inside-avoid border-l-4 pl-3 ${verificado ? "border-primary" : "border-accent-strong"}`}
    >
      <p>
        <strong>{verificado ? "Verificado" : "Sin verificar"}:</strong> {habilitante.denominacion}{" "}
        <span className="text-muted-foreground">({habilitante.organismo})</span>
      </p>
      {!verificado && <p className="text-muted-foreground">{queFaltaConfirmar(habilitante)}</p>}
      {habilitante.fuentes.length > 0 && (
        <ul className="mt-1 flex flex-col gap-1">
          {habilitante.fuentes.map((fuente) => (
            <li key={fuente.denominacion} className="text-muted-foreground">
              {fuente.url != null ? (
                <a
                  href={fuente.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  {fuente.denominacion}
                </a>
              ) : (
                fuente.denominacion
              )}
              {fuente.fecha_documento != null &&
                `, documento del ${FECHA_LARGA.format(new Date(`${fuente.fecha_documento}T00:00`))}`}
              {fuente.estado_validacion === "provisional" &&
                ". Dato provisional: la fuente todavía no fue validada"}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function queFaltaConfirmar(habilitante: Habilitante): string {
  const vigencia = !habilitante.vigencia_confirmada;
  const aplica = !habilitante.aplicabilidad_confirmada;
  if (vigencia && aplica)
    return "No pudimos confirmar que siga vigente ni que alcance a esta carrera. Consultalo antes de contar con él.";
  if (vigencia) return "No pudimos confirmar que siga vigente. Consultalo antes de contar con él.";
  return "La fuente no dice si alcanza a esta carrera. Consultalo antes de contar con él.";
}

function Dimension({ dimension }: { dimension: EvidenciaInforme }) {
  return (
    <div className="border-border flex break-inside-avoid flex-col gap-2 border-b pb-3 text-sm">
      <h3 className="flex flex-wrap items-baseline justify-between gap-2 font-medium">
        <span>{dimension.nombre}</span>
        <span className="text-muted-foreground text-sm font-normal">
          {comoTeCae(dimension.intensidad)}
        </span>
      </h3>
      {dimension.objecion != null && (
        <p className="bg-accent-soft text-accent-foreground rounded-md p-2">
          Marcaste que esto no te representa.
          {dimension.objecion !== "" && <> Anotaste: «{dimension.objecion}»</>}
        </p>
      )}
      <ul className="flex flex-col gap-1">
        {dimension.citas.map((cita) => (
          <li key={cita.evidencia_id}>
            <blockquote className="italic">«{cita.texto}»</blockquote>
            {/* La misma frase puede sostener un rechazo: sin decirlo, «odio
                arreglar cosas» debajo de una dimensión se leería como afinidad. */}
            {cita.valencia < 0 && (
              <p className="text-muted-foreground text-xs">Lo dijiste como algo que no te gusta.</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

const FECHA_LARGA = new Intl.DateTimeFormat("es-AR", { dateStyle: "long" });
