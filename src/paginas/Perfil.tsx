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
 */

import { useCallback, useEffect, useState } from "react";

import { ErrorDeApi, SesionVencida } from "../api/cliente";
import { obtenerPerfil, type Evidencia, type Perfil as PerfilApi, type Rasgo } from "../api/perfil";

interface Propiedades {
  alVolver: () => void;
}

export default function Perfil({ alVolver }: Propiedades) {
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

  if (cargando) {
    return (
      <p aria-live="polite" className="text-muted-foreground text-sm">
        Armando tu perfil…
      </p>
    );
  }

  if (error !== null) {
    return (
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
    );
  }

  if (perfil === null) return null;

  const contados = perfil.rasgos.filter((rasgo) => rasgo.confianza !== "insuficiente");
  const sinHablar = perfil.rasgos.filter((rasgo) => rasgo.confianza === "insuficiente");
  // De lo que más te tira a lo que menos. Un rechazo marcado también dice algo,
  // y por eso queda abajo pero queda: no se esconde.
  const ordenados = [...contados].sort((a, b) => b.intensidad - a.intensidad);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h1 className="text-xl font-semibold">Lo que fui entendiendo de vos</h1>
          <button
            type="button"
            onClick={alVolver}
            className="border-input hover:bg-primary-soft inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm"
          >
            Volver
          </button>
        </div>
        <Encabezado perfil={perfil} conRasgos={contados.length} />
      </div>

      {ordenados.length > 0 && (
        <ul className="flex flex-col gap-4">
          {ordenados.map((rasgo) => (
            <li key={rasgo.dimension}>
              <Tarjeta rasgo={rasgo} />
            </li>
          ))}
        </ul>
      )}

      {sinHablar.length > 0 && (
        <section className="border-border bg-surface rounded-md border p-4 text-sm">
          {/* Las dimensiones sin evidencia no son un cero y no se pueden
              dibujar como una barra vacía: es que la persona no habló de eso.
              Mostrarlas como «bajo» sería afirmar algo que nadie dijo. */}
          <h2 className="font-medium">De esto todavía no hablamos</h2>
          <p className="text-muted-foreground mt-1">
            No es que te haya salido bajo: es que no salió en la charla. Si te interesa que
            aparezca, contámelo la próxima vez.
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {sinHablar.map((rasgo) => (
              <li
                key={rasgo.dimension}
                className="border-border rounded-full border px-3 py-1"
                title={rasgo.descripcion}
              >
                {rasgo.nombre || rasgo.dimension}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Chico y al pie, pero presente: dos perfiles armados con reglas
          distintas no son comparables, y quien lea esto más adelante —el
          asesor, la medición de concordancia— necesita saber cuáles rigieron. */}
      <p className="text-muted-foreground text-xs">
        Armado con la versión <span className="tabular-nums">{perfil.version_instrumento}</span> de
        las reglas de VocaIA.
      </p>
    </div>
  );
}

function Encabezado({ perfil, conRasgos }: { perfil: PerfilApi; conRasgos: number }) {
  if (perfil.actualizado_en === null || conRasgos === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Todavía no hablamos lo suficiente como para decirte nada. Conversá un rato y volvé acá: esto
        se arma solo con lo que me vayas contando.
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
        <p className="bg-accent-soft text-accent-foreground rounded-md p-3">
          Es un primer bosquejo: alcanza para seguir conversando, <strong>no</strong> para
          recomendarte carreras. Cuanto más me cuentes, más se afina.
        </p>
      )}
    </div>
  );
}

function Tarjeta({ rasgo }: { rasgo: Rasgo }) {
  return (
    <article className="border-border bg-surface flex flex-col gap-2 rounded-md border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-medium">{rasgo.nombre || rasgo.dimension}</h2>
        <span className="text-muted-foreground text-sm">{comoTeCae(rasgo.intensidad)}</span>
      </div>

      {rasgo.descripcion !== "" && <p className="text-sm">{rasgo.descripcion}</p>}

      <p className="text-muted-foreground text-sm">
        {RESPALDO[rasgo.confianza] ?? RESPALDO.baja} {cuantas(rasgo.unidades)}
      </p>

      {rasgo.evidencias.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">En qué me baso</summary>
          <ul className="mt-2 flex flex-col gap-3">
            {rasgo.evidencias.map((evidencia) => (
              <Cita key={evidencia.id} evidencia={evidencia} />
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}

function Cita({ evidencia }: { evidencia: Evidencia }) {
  return (
    <li className="border-border border-l-2 pl-3">
      <blockquote className="italic">«{evidencia.fragmento}»</blockquote>
      <p className="text-muted-foreground mt-1 text-xs">
        Lo dijiste el {fecha(evidencia.emitida_en)}.
        {evidencia.confianza_degradada && (
          // C-2: que un interés venga de un mandato familiar no prueba que sea
          // falso, así que la lectura no se descarta. Pero la persona tiene que
          // saber que pesó menos, o no puede discutir el criterio.
          <> Ahí aparecía alguien de tu entorno opinando, así que lo tomé con pinzas.</>
        )}
      </p>
    </li>
  );
}

/** Cómo se lee la escala de -2 a 2 sin nombrarla. */
function comoTeCae(intensidad: number): string {
  if (intensidad >= 1) return "Te entusiasma";
  if (intensidad >= 0.25) return "Te interesa";
  if (intensidad > -0.25) return "Te resulta indistinto";
  if (intensidad > -1) return "No te termina de cerrar";
  return "Te desagrada";
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

const FECHA = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long" });

function fecha(iso: string): string {
  return FECHA.format(new Date(iso));
}
