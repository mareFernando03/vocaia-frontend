/**
 * El informe del cierre de una sesión (HU-16, S4-04).
 *
 * Es lo que la persona se lleva: por eso se descarga, y por eso el orden es el
 * de lo que le importa a quien lo lee sin haber estado en la conversación:
 * las carreras, cada una con su porqué y su ficha de la Facultad plegada; lo
 * que la puede frenar (becas y habilitantes); lo que contó como respaldo, y con
 * quién hablar, siempre a la vista. Que el dato es provisional o el perfil
 * parcial va arriba, sin desplegar. Al pie, cuándo se calculó el perfil, para
 * que el PDF quede fechado.
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

import {
  ArrowLeft,
  ChevronDown,
  Download,
  Info,
  Mail,
  MessageCircle,
  MessageSquareHeart,
  Phone,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { describir, ErrorDeApi } from "../api/cliente";
import {
  obtenerInforme,
  type CarreraInforme,
  type Derivacion,
  type EvidenciaInforme,
  type Habilitante,
  type Habilitantes,
  type Informe as DatosInforme,
} from "../api/informe";
import { AvisoDesactualizado } from "../componentes/AvisoDesactualizado";
import { Referencia } from "../componentes/Referencia";
import { Aviso } from "../componentes/ui/Aviso";
import { Boton } from "../componentes/ui/Boton";
import { Cargando } from "../componentes/ui/Cargando";
import { clasesBoton } from "../componentes/ui/clases-boton";
import { EncabezadoPagina } from "../componentes/ui/EncabezadoPagina";
import { ErrorConReintento } from "../componentes/ui/ErrorConReintento";
import { MedidorGusto } from "../componentes/ui/MedidorGusto";
import { Tarjeta } from "../componentes/ui/Tarjeta";
import { PILOTO } from "../contenido/piloto";
import { enOtraConversacion, useInicios } from "../hooks/useConversaciones";
import { fechaLarga } from "../lib/fechas";

interface Propiedades {
  sesionId: string;
  alVolver: () => void;
}

// Un minuto y medio de espera como tope. Pasado el minuto, si el trabajo del
// cierre se cayó, el backend lo rehace al leer. Al llegar al tope se deja de
// insistir: la pantalla dice que el informe sigue preparándose, que puede
// volver desde su historial, y deja volver a intentar a mano.
const INTENTOS_MIENTRAS_SE_ARMA = 18;

interface Espera {
  segundos: number;
  intento: number;
}

/** Las tarjetas del informe: en papel, sin sombra y sin cortarse entre páginas. */
const TARJETA = "flex flex-col gap-3 text-sm break-inside-avoid print:shadow-none";

export default function Informe({ sesionId, alVolver }: Propiedades) {
  const [informe, setInforme] = useState<DatosInforme | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Un objeto nuevo por cada 409, aunque diga los mismos segundos: es lo que
  // hace que el efecto de abajo vuelva a programar el pedido.
  const [espera, setEspera] = useState<Espera | null>(null);
  const [agotada, setAgotada] = useState(false);

  const cargar = useCallback(
    async (intento = 0) => {
      setError(null);
      setAgotada(false);
      try {
        setInforme(await obtenerInforme(sesionId));
        setEspera(null);
      } catch (fallo) {
        // Recién cerrada, el informe se arma después de la última respuesta:
        // es una espera, no un error. Sólo ese 409 trae `Retry-After`; el de
        // una sesión que no cerró, y el 404 de una ajena, sí son un error y
        // traen un texto escrito para la persona.
        if (fallo instanceof ErrorDeApi && fallo.reintentarEn !== null) {
          if (intento < INTENTOS_MIENTRAS_SE_ARMA) {
            setEspera({ segundos: fallo.reintentarEn, intento: intento + 1 });
          } else {
            setEspera(null);
            setAgotada(true);
          }
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

  const esperando = informe === null && error === null && !agotada;

  return (
    <article className="flex flex-col gap-8 print:break-inside-auto">
      <div className="flex flex-col gap-2">
        {/* Volver va arriba y a la izquierda: es donde se lo busca para salir
            de una pantalla que se abrió encima de otra. */}
        <Boton variante="fantasma" onClick={alVolver} className="-ms-3 self-start print:hidden">
          <ArrowLeft aria-hidden="true" />
          Volver
        </Boton>
        <EncabezadoPagina
          titulo="Tu informe"
          acciones={
            informe !== null && (
              <>
                <Boton variante="primario" onClick={() => window.print()}>
                  <Download aria-hidden="true" />
                  Descargar en PDF
                </Boton>
                {/* La encuesta final del piloto vive en la página de
                    inscripción, que la reconoce por la misma cuenta de Google.
                    Se ofrece acá porque es cuando la persona acaba de leer el
                    informe. */}
                <a
                  href={PILOTO.encuesta}
                  target="_blank"
                  rel="noopener"
                  className={clasesBoton("secundario")}
                >
                  <MessageSquareHeart aria-hidden="true" />
                  {PILOTO.comoTeFue}
                </a>
              </>
            )
          }
        >
          {informe !== null && (
            <p className="text-muted-foreground text-sm">
              Armado el {fechaLarga(informe.generado_en)}.
            </p>
          )}
        </EncabezadoPagina>
      </div>

      {/* Siempre presente, para que el cambio de «buscando» a «se está
          armando» se anuncie. */}
      <p role="status" className="text-muted-foreground text-sm empty:hidden">
        {esperando && (
          <Cargando
            texto={
              espera === null
                ? "Buscando tu informe…"
                : "Tu informe se está armando con lo último que contaste. Tarda unos segundos…"
            }
          />
        )}
        {agotada &&
          "Tu informe todavía se está preparando. Podés volver en unos minutos y abrirlo desde «Tus conversaciones»."}
      </p>

      {agotada && (
        <Boton onClick={() => void cargar()} className="self-start print:hidden">
          Volver a intentar
        </Boton>
      )}

      {error !== null && (
        <ErrorConReintento alReintentar={() => void cargar()}>{error}</ErrorConReintento>
      )}

      {informe !== null && <Contenido informe={informe} />}
    </article>
  );
}

function Contenido({ informe }: { informe: DatosInforme }) {
  const provisional = informe.recomendaciones.some((carrera) =>
    carrera.fuentes.some((fuente) => fuente.estado_validacion === "provisional"),
  );
  const derivacion = informe.recomendaciones.find(
    (carrera) => carrera.derivacion != null,
  )?.derivacion;
  const deOtra = informe.evidencia.some((d) =>
    d.citas.some((cita) => cita.sesion_id !== informe.sesion_id),
  );
  const inicios = useInicios(deOtra);
  const notaHabilitantes = informe.recomendaciones.find(
    (carrera) => carrera.habilitantes?.nota != null,
  )?.habilitantes?.nota;
  const conApoyos = informe.recomendaciones.filter(
    (carrera) => carrera.habilitantes != null && hayApoyos(carrera.habilitantes),
  );
  const hayCarreras = informe.recomendaciones.length > 0;

  useAbrirPlegadosAlImprimir();

  // Los accesos a cada parte, sólo de las que hay: un enlace a una sección que
  // no está no lleva a ningún lado.
  const partes: { id: string; nombre: string }[] = [];
  if (hayCarreras) partes.push({ id: "carreras", nombre: "Carreras" });
  if (conApoyos.length > 0) partes.push({ id: "lo-que-te-frena", nombre: "Lo que te frena" });
  if (informe.evidencia.length > 0)
    partes.push({ id: "lo-que-contaste", nombre: "Lo que contaste" });
  if (derivacion != null) partes.push({ id: "con-quien-hablar", nombre: "Con quién hablar" });

  return (
    <div className="flex flex-col gap-10 break-words">
      {/* La franja de divulgación de `App` no sale en el PDF, y el PDF es
          justamente lo que circula sin la pantalla al lado. Lo que cambia cuánto
          creerle al informe va arriba y a la vista, no plegado. */}
      <Aviso tono="info" icono={<Info />} className="print:border print:bg-transparent">
        <p>
          Lo armó una <strong>inteligencia artificial</strong> a partir de tu conversación. No
          reemplaza a un orientador vocacional, y puede equivocarse: antes de decidir, verificá con
          la Facultad lo que dice sobre cada carrera.
        </p>
        {provisional && (
          <p>
            La información de la Facultad es <strong>provisional</strong>: sale de fuentes públicas
            y la Facultad todavía no la validó.
          </p>
        )}
        {!informe.publicable && (
          <p>
            Tu perfil es <strong>parcial</strong>:{" "}
            {hayCarreras
              ? "tomá las carreras de abajo como orientativas."
              : "todavía no alcanza para sugerirte carreras."}
          </p>
        )}
      </Aviso>

      {partes.length > 1 && (
        <nav aria-label="Partes del informe" className="-mt-4 print:hidden">
          <ul className="flex flex-wrap gap-2">
            {partes.map((parte) => (
              <li key={parte.id}>
                <a href={`#${parte.id}`} className={clasesBoton("secundario", "rounded-full")}>
                  {parte.nombre}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Sin carreras no es un error: las notas dicen por qué, y es lo que se
          muestra en lugar de las carreras, no un aviso encima de nada. */}
      {!hayCarreras && informe.notas.length > 0 && <Notas notas={informe.notas} />}

      {hayCarreras && (
        <Seccion id="carreras" titulo="Carreras que te sugerimos">
          <p className="text-muted-foreground -mt-2 text-sm">
            Las elegimos por los intereses que mostraste en todas tus charlas.
          </p>
          {informe.recomendaciones.map((carrera) => (
            <Carrera key={carrera.carrera} carrera={carrera} />
          ))}
          {/* A la vista, no plegado: son salvedades sobre las carreras. */}
          {informe.notas.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-semibold">Antes de decidir, tené en cuenta</h3>
              <Notas notas={informe.notas} />
            </div>
          )}
        </Seccion>
      )}

      {conApoyos.length > 0 && (
        <Seccion id="lo-que-te-frena" titulo="Si hay algo que te frena">
          {conApoyos.map((carrera) => (
            <Tarjeta key={carrera.carrera} className={TARJETA}>
              <h3 className="text-base font-semibold">{carrera.titulo}</h3>
              <SiAlgoTeFrena habilitantes={carrera.habilitantes!} />
            </Tarjeta>
          ))}
        </Seccion>
      )}

      {/* Una vez y no en cada carrera: es la misma nota para todas. */}
      {notaHabilitantes != null && (
        <p className="text-muted-foreground -mt-6 text-sm">{notaHabilitantes}</p>
      )}

      {informe.evidencia.length > 0 && (
        <Seccion id="lo-que-contaste" titulo="Lo que contaste">
          <p className="text-muted-foreground -mt-2 text-sm">
            Tus palabras, tal como las escribiste, agrupadas por el interés que muestran. Es de
            donde sale todo lo anterior.
          </p>
          <div className="grid items-start gap-4 sm:grid-cols-2">
            {informe.evidencia.map((dimension) => (
              <Dimension
                key={dimension.dimension}
                dimension={dimension}
                sesionDelInforme={informe.sesion_id}
                inicios={inicios}
              />
            ))}
          </div>
        </Seccion>
      )}

      {/* Una vez y al final, no debajo de cada carrera: es el mismo contacto de
          área para todas, y repetido tres veces se leía como relleno. */}
      {derivacion != null && <ConQuienHablar derivacion={derivacion} />}

      {/* La versión del instrumento sigue guardada en el informe, que es donde
          la leen el asesor y la medición de concordancia; a la persona no le
          dice nada (prueba del piloto). */}
      {informe.perfil_actualizado_en !== null && (
        <p className="text-muted-foreground border-border border-t pt-3 text-xs">
          Perfil calculado el {fechaLarga(informe.perfil_actualizado_en)}.
        </p>
      )}
    </div>
  );
}

function Seccion({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="flex flex-col gap-4">
      <h2 id={`${id}-titulo`} className="text-xl font-semibold tracking-tight">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Notas({ notas }: { notas: string[] }) {
  return (
    <Aviso tono="precaucion" className="print:border print:bg-transparent">
      {notas.map((nota) => (
        <p key={nota}>{nota}</p>
      ))}
    </Aviso>
  );
}

/**
 * Un `<details>` cerrado no se imprime, y el PDF es lo que la persona se lleva:
 * se abren todos al imprimir y se cierran los que se abrieron.
 */
function useAbrirPlegadosAlImprimir() {
  useEffect(() => {
    let abiertos: HTMLDetailsElement[] = [];
    const antes = () => {
      abiertos = [...document.querySelectorAll("details")].filter((d) => !d.open);
      abiertos.forEach((d) => (d.open = true));
    };
    const despues = () => abiertos.forEach((d) => (d.open = false));
    window.addEventListener("beforeprint", antes);
    window.addEventListener("afterprint", despues);
    return () => {
      window.removeEventListener("beforeprint", antes);
      window.removeEventListener("afterprint", despues);
    };
  }, []);
}

function hayApoyos(habilitantes: Habilitantes): boolean {
  return habilitantes.por_restriccion.length > 0 || habilitantes.alternativas.length > 0;
}

/**
 * Cada carrera con todo lo suyo: por qué, cómo recibirse antes, lo que dice la
 * Facultad (plegado: sirve para verificar, no para decidir) y cómo avisar si un
 * dato está mal. La ficha iba antes en una sección aparte al final, lejos de la
 * carrera de la que hablaba.
 */
function Carrera({ carrera }: { carrera: CarreraInforme }) {
  return (
    <Tarjeta como="article" className={TARJETA}>
      <h3 className="text-lg leading-snug font-semibold">{carrera.titulo}</h3>
      <p className="leading-relaxed">{carrera.justificacion}</p>
      {carrera.via_corta != null && (
        <p className="leading-relaxed">
          Si necesitás recibirte antes: el <strong>{carrera.via_corta.titulo}</strong>
          {carrera.via_corta.duracion_anios != null &&
            ` (${carrera.via_corta.duracion_anios} años)`}{" "}
          es el título intermedio de esta carrera.
        </p>
      )}
      {carrera.fuentes.length > 0 && (
        <details className="group border-border border-t pt-1">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 font-medium [&::-webkit-details-marker]:hidden">
            Datos de la carrera
            <ChevronDown
              aria-hidden="true"
              className="text-muted-foreground size-5 transition-transform group-open:rotate-180 print:hidden"
            />
          </summary>
          <FichaDeLaFacultad carrera={carrera} />
        </details>
      )}
      <AvisoDesactualizado carrera={carrera.titulo} />
    </Tarjeta>
  );
}

/** Lo que dice la Facultad de una carrera, con sus fuentes. */
function FichaDeLaFacultad({ carrera }: { carrera: CarreraInforme }) {
  return (
    <ul className="flex flex-col gap-3 pb-2">
      {carrera.fuentes.map((fuente) => (
        <li key={fuente.id} className="break-inside-avoid">
          <blockquote className="border-accent-strong border-l-4 pl-3 leading-relaxed whitespace-pre-wrap">
            {paraLaPersona(fuente.texto)}
          </blockquote>
          <p className="text-muted-foreground mt-1">
            Fuente: <Referencia texto={fuente.fuente} />
          </p>
        </li>
      ))}
    </ul>
  );
}

/**
 * La ficha de la carrera sin la oración que le avisa al modelo qué no publica
 * ninguna fuente: «Ninguna fuente publica: turnos de cursado» es una
 * instrucción para no inventar el dato, y en el informe se leía como jerga.
 * Se saca al mostrar y no del corpus: la ficha está congelada contra el banco de
 * la medición de alucinación.
 */
function paraLaPersona(texto: string): string {
  return texto.replace(/\s*Ninguna fuente publica:[^.]*\./g, "").trim();
}

/**
 * Con quién de la Facultad seguir hablando de la carrera (HU-19). Es el mismo
 * contacto de área para todas, y sólo llega si la Facultad lo validó: sin
 * validar se dice eso, y no se inventa uno.
 *
 * Cada medio es un botón que ya hace lo suyo (abre el correo, llama, abre
 * WhatsApp), con el dato escrito en el botón: en el PDF el botón no se toca, y
 * el dato tiene que poder leerse y copiarse.
 */
function ConQuienHablar({ derivacion }: { derivacion: Derivacion }) {
  const { contacto } = derivacion;
  return (
    <Seccion id="con-quien-hablar" titulo="Con quién hablar">
      <Tarjeta className={TARJETA}>
        {derivacion.disponible && contacto != null ? (
          <>
            <p className="leading-relaxed">
              Si querés hablar con alguien de la Facultad sobre estas carreras: {contacto.area}.
            </p>
            <ul className="flex flex-wrap gap-2">
              <li>
                <a href={`mailto:${contacto.correo}`} className={clasesBoton("secundario")}>
                  <Mail aria-hidden="true" />
                  {contacto.correo}
                </a>
              </li>
              {contacto.telefono != null && (
                <li>
                  <a href={`tel:${contacto.telefono}`} className={clasesBoton("secundario")}>
                    <Phone aria-hidden="true" />
                    {contacto.telefono}
                  </a>
                </li>
              )}
              {contacto.whatsapp != null && (
                <li>
                  <a
                    href={`https://wa.me/${contacto.whatsapp.replace(/\D/g, "")}`}
                    className={clasesBoton("secundario")}
                  >
                    <MessageCircle aria-hidden="true" />
                    {contacto.whatsapp}
                  </a>
                </li>
              )}
            </ul>
          </>
        ) : (
          <p>Todavía no tenemos un contacto de la Facultad confirmado.</p>
        )}
      </Tarjeta>
    </Seccion>
  );
}

const RESTRICCIONES: Record<string, string> = {
  economica: "Si lo que te frena es la plata",
  geografica: "Si lo que te frena es la distancia",
  laboral: "Si lo que te frena es el trabajo",
  academica: "Si lo que te frena es el nivel académico",
  familiar: "Si lo que te frena es la situación familiar",
};

function SiAlgoTeFrena({ habilitantes }: { habilitantes: Habilitantes }) {
  const { por_restriccion, alternativas } = habilitantes;
  // El título y el «sin nada que mostrar» los resuelve la sección de arriba.
  return (
    <div className="flex flex-col gap-4">
      {por_restriccion.map((grupo) => (
        <div key={grupo.restriccion} className="flex flex-col gap-2">
          <h4 className="font-medium">
            {/* Un tipo que no conocemos no se nombra: podría ser una categoría
                sensible, y el informe se imprime y se comparte. */}
            {RESTRICCIONES[grupo.restriccion] ?? "Otras circunstancias que mencionaste"}
          </h4>
          {/* La restricción ya no está en «En qué me baso» (P-11): sin la cita no
              se entiende por qué se ofrece lo que sigue. Un informe viejo llega vacío. */}
          {grupo.citas.length > 0 && (
            <p className="text-muted-foreground">
              Lo contaste así: {grupo.citas.map((cita) => `«${cita}»`).join(" · ")}
            </p>
          )}
          {grupo.verificados.length + grupo.no_verificados.length > 0 && (
            <ul className="flex flex-col gap-3">
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
          <h4 className="font-medium">Carreras cercanas</h4>
          <ul className="flex flex-col gap-2">
            {alternativas.map((alternativa) => (
              <li key={alternativa.carrera} className="break-inside-avoid">
                <p className="font-medium">{alternativa.titulo}</p>
                <p className="leading-relaxed">{alternativa.justificacion}</p>
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
                `, documento del ${fechaLarga(`${fuente.fecha_documento}T00:00`)}`}
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

function Dimension({
  dimension,
  sesionDelInforme,
  inicios,
}: {
  dimension: EvidenciaInforme;
  sesionDelInforme: string;
  inicios: Map<string, string | null>;
}) {
  return (
    <Tarjeta className={TARJETA}>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-base font-semibold">{dimension.nombre}</h3>
        <MedidorGusto intensidad={dimension.intensidad} />
      </div>
      {dimension.objecion != null && (
        <Aviso tono="precaucion" className="p-2 sm:p-3">
          <p>
            Marcaste que esto no te representa.
            {dimension.objecion !== "" && <> Anotaste: «{dimension.objecion}»</>}
          </p>
        </Aviso>
      )}
      <ul className="flex flex-col gap-2">
        {dimension.citas.map((cita) => (
          <li key={cita.evidencia_id}>
            <blockquote className="border-border border-l-2 pl-3 leading-relaxed italic">
              «{cita.texto}»
            </blockquote>
            {/* Solo el rechazo explícito (−2) se rotula: sin decirlo, «odio
                arreglar cosas» se leería como afinidad. Con −1 es una
                aclaración («no fue por arte») y rotularla como rechazo la
                falsea. Arreglo parcial: el de fondo es del backend. */}
            {cita.valencia === -2 && (
              <p className="text-muted-foreground mt-0.5 ps-3 text-xs">
                Lo dijiste como algo que no te gusta.
              </p>
            )}
            {/* El perfil junta todas las conversaciones; sin esto, el informe de
                una charla mostraba citas de otra como si fueran de esta. */}
            {cita.sesion_id !== sesionDelInforme && (
              <p className="text-muted-foreground mt-0.5 ps-3 text-xs">
                {enOtraConversacion(inicios.get(cita.sesion_id))}
              </p>
            )}
          </li>
        ))}
      </ul>
    </Tarjeta>
  );
}
