/**
 * Pantalla de perfil (HU-13, S2-11).
 *
 * El criterio de aceptación es que una persona ajena al proyecto entienda qué
 * dice su perfil y por qué. Eso gobierna todo lo que sigue: acá no aparecen
 * «intensidad», «soporte», «valencia» ni «confianza de la dimensión», que son
 * los nombres con los que el backend piensa el perfil. Se traducen a frases, y
 * los números que sí se muestran son los contables —cuántas cosas contó la
 * persona—, no los agregados de la escala.
 *
 * Lo que no se traduce es la evidencia: se cita literal. Es la respuesta a «en
 * qué se basa esto» (RNF-05) y parafrasearla la arruinaría, porque lo que la
 * persona tiene que poder reconocer —o desconocer— es algo que escribió ella.
 *
 * Desconocerlo es S2-12: cada dimensión se puede objetar. La objeción no
 * corrige el perfil ni lo tacha —el rasgo sigue mostrándose con los mismos
 * números—, porque lo que se registra es el desacuerdo entre lo que el sistema
 * infiere y lo que la persona reconoce, y corregirlo en silencio haría
 * desaparecer justamente eso.
 */

import { ChevronDown, LogOut, MessageSquareOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ErrorDeApi, SesionVencida } from "../api/cliente";
import { obtenerHistorial, type Historial } from "../api/conversacion";
import {
  objetar,
  obtenerPerfil,
  type Evidencia,
  type Perfil as PerfilApi,
  type Rasgo,
} from "../api/perfil";
import { BajaDeLaCuenta } from "../componentes/BajaDeLaCuenta";
import { ConsentimientoNotificacion } from "../componentes/ConsentimientoNotificacion";
import { DescargaDeDatos } from "../componentes/DescargaDeDatos";
import { Aviso } from "../componentes/ui/Aviso";
import { Boton } from "../componentes/ui/Boton";
import { Cargando } from "../componentes/ui/Cargando";
import { EncabezadoPagina } from "../componentes/ui/EncabezadoPagina";
import { ErrorConReintento } from "../componentes/ui/ErrorConReintento";
import { MedidorGusto } from "../componentes/ui/MedidorGusto";
import { Tarjeta } from "../componentes/ui/Tarjeta";
import { descripcionParaLaPersona } from "../contenido/dimensiones";
import { enLaConversacion, useInicios } from "../hooks/useConversaciones";
import { fechaCorta } from "../lib/fechas";

interface Propiedades {
  alSalir: () => Promise<void>;
  alDarDeBaja: () => Promise<void>;
  correoDeIngreso?: string;
}

/**
 * El aviso a la Facultad (HU-03b) va acá porque es donde la persona ve lo suyo,
 * y va al lado del perfil y no adentro: si el perfil no carga, igual tiene que
 * poder consultarlo y revocarlo.
 */
export default function Perfil({ alSalir, alDarDeBaja, correoDeIngreso }: Propiedades) {
  return (
    <div className="flex flex-col gap-10">
      <ContenidoPerfil />
      {/* La cuenta activa se muestra junto a la salida, para que la persona
          pueda identificarla y cambiarla sin confundirla con su perfil. */}
      <section aria-labelledby="tu-cuenta" className="flex flex-col gap-4">
        <h2 id="tu-cuenta" className="text-xl font-semibold tracking-tight">
          Tu cuenta
        </h2>
        <Tarjeta className="flex-row flex-wrap items-center justify-between gap-x-4 print:hidden">
          {correoDeIngreso && (
            <dl className="min-w-0 text-sm">
              <dt className="text-muted-foreground">Correo de inicio de sesión</dt>
              <dd className="mt-1 font-medium [overflow-wrap:anywhere]">{correoDeIngreso}</dd>
            </dl>
          )}
          <Boton variante="peligro-fantasma" onClick={() => void alSalir()} className="-ms-3">
            <LogOut aria-hidden="true" />
            Cerrar sesión
          </Boton>
        </Tarjeta>
        <ConsentimientoNotificacion />
        <DescargaDeDatos />
        <BajaDeLaCuenta alDarDeBaja={alDarDeBaja} />
      </section>
    </div>
  );
}

function ContenidoPerfil() {
  const [perfil, setPerfil] = useState<PerfilApi | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setPerfil(await obtenerPerfil());
    } catch (fallo) {
      // La sesión vencida ya la resolvió el cliente descartando el token, y
      // App vuelve al ingreso: mostrar un error acá sería hablarle a una
      // pantalla que está por desaparecer.
      if (!(fallo instanceof SesionVencida)) {
        setError(fallo instanceof ErrorDeApi ? fallo.message : "No se pudo traer tu perfil.");
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /**
   * Registra la objeción y vuelve a pedir el perfil.
   *
   * Se recarga en lugar de parchear el rasgo en memoria: lo que la pantalla
   * tiene que mostrar es la objeción tal como quedó guardada, no la que
   * acabamos de mandar. Si el registro no fuera recuperable, acá se vería.
   */
  const registrarObjecion = useCallback(async (dimension: string, motivo: string) => {
    await objetar(dimension, motivo);
    setPerfil(await obtenerPerfil());
  }, []);

  // Antes de los retornos tempranos: es un hook. Pide la lista sólo si el
  // perfil junta más de una conversación.
  const inicios = useInicios((perfil?.sesiones ?? []).length > 1);

  if (cargando) {
    return (
      <p aria-live="polite">
        <Cargando texto="Armando tu perfil…" />
      </p>
    );
  }

  if (error !== null) {
    return <ErrorConReintento alReintentar={() => void cargar()}>{error}</ErrorConReintento>;
  }

  if (perfil === null) return null;

  const contados = perfil.rasgos.filter((rasgo) => rasgo.confianza !== "insuficiente");
  const sinHablar = perfil.rasgos.filter((rasgo) => rasgo.confianza === "insuficiente");
  // De lo que más te tira a lo que menos. Un rechazo marcado también dice algo,
  // y por eso queda abajo pero queda: no se esconde. Lo que no mide un interés
  // va al final: ordenarlo por intensidad lo pondría entre los gustos.
  const ordenados = [...contados].sort(
    (a, b) => Number(b.mide_interes) - Number(a.mide_interes) || b.intensidad - a.intensidad,
  );

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Lo que fui entendiendo de vos">
        <Encabezado perfil={perfil} conRasgos={contados.length} />
      </EncabezadoPagina>

      {ordenados.length > 0 && (
        <ul className="flex flex-col gap-4">
          {ordenados.map((rasgo) => (
            <li key={rasgo.dimension}>
              <TarjetaRasgo
                rasgo={rasgo}
                alObjetar={registrarObjecion}
                conFecha={variosDias(ordenados)}
                inicios={inicios}
              />
            </li>
          ))}
        </ul>
      )}

      {sinHablar.length > 0 && (
        <Tarjeta como="section" className="flex flex-col gap-2 text-sm">
          {/* Las dimensiones sin evidencia no son un cero y no se pueden
              dibujar como una barra vacía: es que la persona no habló de eso.
              Mostrarlas como «bajo» sería afirmar algo que nadie dijo. */}
          <h2 className="text-base font-semibold">De esto todavía no hablamos</h2>
          <p className="text-muted-foreground">
            No es que te haya salido bajo: es que no salió en la charla. Si te interesa que
            aparezca, contámelo la próxima vez.
          </p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {sinHablar.map((rasgo) => (
              <li
                key={rasgo.dimension}
                className="bg-primary-soft rounded-full px-3 py-1.5 font-medium"
                title={descripcionParaLaPersona(rasgo.dimension, rasgo.descripcion)}
              >
                {rasgo.nombre || rasgo.dimension}
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}

      {/* La versión del instrumento no se muestra: a la persona no le dice nada
          (prueba del piloto). Sigue guardada con el perfil, que es donde la
          leen el asesor y la medición de concordancia. */}
    </div>
  );
}

function Encabezado({ perfil, conRasgos }: { perfil: PerfilApi; conRasgos: number }) {
  if (perfil.actualizado_en === null || conRasgos === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Todavía no hablamos lo suficiente como para poder decirte algo. Tu perfil aparece acá cuando
        termina la primera parte de la charla, y se va completando con lo que me sigas contando.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="text-muted-foreground">
        Esto no es un test ni un resultado: es lo que entendí de lo que me contaste, y podés
        discutirlo. Última actualización: {fecha(perfil.actualizado_en)}.
      </p>
      {/* La salvedad va afuera de todo plegado, por la misma razón que en la
          conversación: una advertencia que hay que desplegar para leer no es
          una advertencia. Por debajo del umbral el perfil se muestra igual
          —tiene que hacerlo—, lo que no se hace es recomendar sobre él. */}
      {!perfil.publicable && (
        <Aviso tono="precaucion">
          <p>
            Es un primer bosquejo: alcanza para seguir conversando, <strong>no</strong> para
            recomendarte carreras. Cuanto más me cuentes, más se afina.
          </p>
        </Aviso>
      )}
    </div>
  );
}

interface PropiedadesTarjeta {
  rasgo: Rasgo;
  alObjetar: (dimension: string, motivo: string) => Promise<void>;
  /** Si las citas del perfil son de más de un día. Si no, la fecha no dice nada. */
  conFecha?: boolean;
  /** Cómo empezó cada conversación, cuando el perfil junta más de una. */
  inicios?: Map<string, string | null>;
}

function TarjetaRasgo({ rasgo, alObjetar, conFecha = false, inicios }: PropiedadesTarjeta) {
  return (
    <Tarjeta como="article" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <h2 className="text-lg leading-snug font-semibold">{rasgo.nombre || rasgo.dimension}</h2>
        {/* Una restricción no es un gusto: «no sé si me pueden pagar el viaje»
            dicho con signo negativo no es algo que a la persona le desagrade. */}
        {rasgo.mide_interes && <MedidorGusto intensidad={rasgo.intensidad} />}
      </div>

      {descripcionParaLaPersona(rasgo.dimension, rasgo.descripcion) !== "" && (
        <p className="leading-relaxed">
          {descripcionParaLaPersona(rasgo.dimension, rasgo.descripcion)}
        </p>
      )}

      <p className="text-muted-foreground text-sm">
        {RESPALDO[rasgo.confianza] ?? RESPALDO.baja} {cuantas(rasgo.unidades)}
      </p>

      {rasgo.evidencias.length > 0 && (
        <EnQueMeBaso rasgo={rasgo} conFecha={conFecha} inicios={inicios} />
      )}

      <Objecion rasgo={rasgo} alObjetar={alObjetar} />
    </Tarjeta>
  );
}

/**
 * «Esto no me representa» (S2-12).
 *
 * Va en cada tarjeta y no en un lugar aparte porque el desacuerdo es con algo
 * concreto que se está leyendo: mandar a la persona a otra pantalla a elegir de
 * una lista qué objeta convierte un reflejo en un trámite, y el trámite no se
 * hace.
 */
function Objecion({ rasgo, alObjetar }: PropiedadesTarjeta) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [registrando, setRegistrando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  if (rasgo.objecion != null) {
    return (
      <p className="border-border text-muted-foreground border-t pt-2 text-sm">
        Marcaste que esto no te representa el {fecha(rasgo.objecion.registrada_en)}.
        {rasgo.objecion.motivo !== "" && <> Anotaste: «{rasgo.objecion.motivo}»</>}
        {/* Y el rasgo se sigue mostrando arriba, con los mismos números. Que
            la persona no se reconozca no borra lo que dijo, y esconderlo haría
            desaparecer la discrepancia, que es el dato que hay que conservar. */}
      </p>
    );
  }

  if (!abierto) {
    return (
      <div className="border-border border-t pt-2">
        <Boton variante="fantasma" onClick={() => setAbierto(true)} className="-ms-3">
          <MessageSquareOff aria-hidden="true" />
          Esto no me representa
        </Boton>
      </div>
    );
  }

  async function registrar() {
    setRegistrando(true);
    setFallo(null);
    try {
      await alObjetar(rasgo.dimension, motivo.trim());
    } catch (error) {
      setRegistrando(false);
      setFallo(
        error instanceof ErrorDeApi ? error.message : "No se pudo registrar. Probá de nuevo.",
      );
    }
    // Sin `finally`: si salió bien, el perfil se recargó y este componente ya
    // no existe. Tocarle el estado ahí sería escribirle a algo desmontado.
  }

  const campo = `motivo-${rasgo.dimension}`;
  return (
    <form
      className="border-border flex flex-col gap-2 border-t pt-2 text-sm"
      onSubmit={(evento) => {
        evento.preventDefault();
        void registrar();
      }}
    >
      <label htmlFor={campo} className="font-medium">
        ¿Querés contarme por qué? Es opcional.
      </label>
      <textarea
        id={campo}
        rows={2}
        value={motivo}
        disabled={registrando}
        onChange={(evento) => setMotivo(evento.target.value)}
        placeholder="Por ejemplo: lo hago por obligación, no porque me guste."
        className="border-input bg-surface placeholder:text-muted-foreground min-h-11 resize-none rounded-xl border p-3 text-base"
      />
      {fallo !== null && (
        <p role="alert" className="text-destructive">
          {fallo}
        </p>
      )}
      <div className="flex gap-2">
        <Boton type="submit" variante="primario" disabled={registrando}>
          Registrar
        </Boton>
        <Boton variante="fantasma" onClick={() => setAbierto(false)}>
          Cancelar
        </Boton>
      </div>
    </form>
  );
}

/**
 * Las citas de un rasgo. Las cortas —«Armar», «Con los de matemática»— no se
 * entienden sin la pregunta que contestaban (segundo recorrido local), así que
 * al abrir se busca esa pregunta en el historial de su sesión. Al abrir y no al
 * dibujar, como la traza de cada respuesta: casi nadie despliega todas.
 */
function EnQueMeBaso({
  rasgo,
  conFecha,
  inicios,
}: {
  rasgo: Rasgo;
  conFecha: boolean;
  inicios?: Map<string, string | null>;
}) {
  const [preguntas, setPreguntas] = useState<Map<string, string>>(new Map());
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    let vigente = true;
    void preguntasDe(rasgo.evidencias.filter((e) => esCorta(e.fragmento))).then(
      (encontradas) => vigente && setPreguntas(encontradas),
    );
    return () => {
      vigente = false;
    };
  }, [abierto, rasgo.evidencias]);

  return (
    <details
      className="group border-border border-t pt-1"
      onToggle={(evento) => setAbierto(evento.currentTarget.open)}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 font-medium [&::-webkit-details-marker]:hidden">
        En qué me baso
        <ChevronDown
          aria-hidden="true"
          className="text-muted-foreground size-5 transition-transform group-open:rotate-180"
        />
      </summary>
      <ul className="flex flex-col gap-3 pb-2">
        {rasgo.evidencias.map((evidencia) => (
          <Cita
            key={evidencia.id}
            evidencia={evidencia}
            pregunta={preguntas.get(evidencia.id)}
            conFecha={conFecha}
            conversacion={inicios && enLaConversacion(inicios.get(evidencia.sesion_id))}
            // La advertencia del mandato es para un interés que pesó menos por
            // eso, no para la cita que cuenta el mandato (segundo recorrido).
            conPinzas={rasgo.mide_interes && evidencia.confianza_degradada}
          />
        ))}
      </ul>
    </details>
  );
}

function esCorta(fragmento: string): boolean {
  return fragmento.trim().split(/\s+/).length <= 4;
}

// El historial de cada sesión se pide una vez por carga de la página, aunque se
// abran varias tarjetas con citas de la misma charla.
const historiales = new Map<string, Promise<Historial | null>>();

async function preguntasDe(evidencias: Evidencia[]): Promise<Map<string, string>> {
  const encontradas = new Map<string, string>();
  for (const evidencia of evidencias) {
    if (!historiales.has(evidencia.sesion_id)) {
      historiales.set(
        evidencia.sesion_id,
        obtenerHistorial(evidencia.sesion_id).catch(() => null),
      );
    }
    const historial = await historiales.get(evidencia.sesion_id);
    const anterior = historial?.turnos.find(
      (turno) => turno.numero === evidencia.turno - 1 && turno.rol === "agente",
    );
    const pregunta = anterior && ultimaPregunta(anterior.contenido);
    if (pregunta) encontradas.set(evidencia.id, pregunta);
  }
  return encontradas;
}

function ultimaPregunta(texto: string): string | null {
  const preguntas = texto.match(/[^.!?\n]*\?/g);
  return preguntas ? preguntas[preguntas.length - 1].trim() : null;
}

function variosDias(rasgos: Rasgo[]): boolean {
  const dias = new Set(rasgos.flatMap((r) => r.evidencias.map((e) => e.emitida_en.slice(0, 10))));
  return dias.size > 1;
}

function Cita({
  evidencia,
  pregunta,
  conFecha,
  conPinzas,
  conversacion,
}: {
  evidencia: Evidencia;
  pregunta?: string;
  conFecha: boolean;
  conPinzas: boolean;
  /** De qué conversación salió, cuando el perfil junta más de una. */
  conversacion?: string | null;
}) {
  return (
    <li className="border-border border-l-2 pl-3">
      {pregunta !== undefined && (
        <p className="text-muted-foreground text-xs">Contestabas a: «{pregunta}»</p>
      )}
      <blockquote className="leading-relaxed italic">«{evidencia.fragmento}»</blockquote>
      <p className="text-muted-foreground mt-1 text-xs empty:hidden">
        {conversacion && `${conversacion} `}
        {conFecha && `Lo dijiste el ${fecha(evidencia.emitida_en)}.`}
        {conPinzas && (
          // C-2: que un interés venga de un mandato familiar no prueba que sea
          // falso, así que la lectura no se descarta. Pero la persona tiene que
          // saber que pesó menos, o no puede discutir el criterio.
          <> Ahí aparecía alguien de tu entorno opinando, así que lo tomé con pinzas.</>
        )}
      </p>
    </li>
  );
}

/** Qué tan asentado está lo que el perfil afirma de una dimensión. */
const RESPALDO: Record<string, string> = {
  // Ninguna de las tres frases afirma cuántas veces la persona lo dijo: eso lo
  // dice `cuantas`, y decirlo dos veces las hace contradecirse. Una lectura
  // sola y contundente alcanza para confianza alta, y «lo contaste más de una
  // vez» al lado de «sale de una sola cosa que me contaste» es un absurdo que
  // le hace perder credibilidad a todo lo demás que la pantalla afirma.
  alta: "Lo contaste con ejemplos concretos.",
  media: "Aparece con claridad en lo que me contaste.",
  baja: "Lo mencionaste al pasar, así que puede cambiar en cuanto sigamos hablando.",
};

function cuantas(unidades: number): string {
  // Se cuentan las cosas que la persona dijo, no el «soporte»: uno es un número
  // que se puede verificar leyendo las citas de abajo, el otro no le dice nada
  // a nadie.
  return unidades === 1
    ? "Sale de una sola cosa que me contaste."
    : `Sale de ${unidades} cosas que me contaste.`;
}

const fecha = fechaCorta;
