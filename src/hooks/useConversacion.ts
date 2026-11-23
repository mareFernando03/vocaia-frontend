/**
 * Continuidad de la conversación (HU-07).
 *
 * El criterio de aceptación es que la conversación siga estando después de
 * recargar. Eso se apoya en dos decisiones:
 *
 * **El identificador de sesión lo genera el cliente.** El backend no tiene
 * endpoint de alta: la sesión nace con el primer mensaje que se manda a
 * `POST /api/conversacion/{sesion_id}/mensaje`. Así que el UUID se crea acá y
 * el primer envío lo estrena.
 *
 * **Se guarda en `sessionStorage`, no en `localStorage`.** Es la misma regla
 * que ya sigue el token en `auth/sesion.ts` y la aceptación del aviso en
 * `useAvisoAceptado`, y por el mismo motivo: esto se va a usar en computadoras
 * compartidas —una sala de informática— y dejar una conversación sobre la
 * situación personal de alguien accesible en la próxima pestaña no compensa la
 * comodidad. Sobrevive a un F5, que es lo que pide HU-07; seguir en otro
 * dispositivo es HU-08 y volver a los meses es HU-14.
 *
 * **Y se olvida al cerrar sesión.** Desde VOCAIA-46 los dos endpoints exigen
 * credencial y la sesión es de quien la abre, así que con el identificador de
 * otra persona el backend devuelve 404. El borrado de acá dejó de ser lo único
 * que separa una conversación de la siguiente, pero se conserva: sin él, la
 * próxima persona que entre en esta pestaña arrastraría un identificador que no
 * le sirve para nada y estrenaría su sesión con un 404 de por medio.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { describir, SesionVencida } from "../api/cliente";
import {
  enviarMensaje,
  type Fuente,
  obtenerHistorial,
  terminarConversacion,
  type Turno,
} from "../api/conversacion";
import { alCambiarSesion } from "../auth/sesion";

const CLAVE = "vocaia:conversacion:sesion";
const PREFIJO_NO_ENVIADO = "vocaia:conversacion:no-enviado:";

function sesionGuardada(): string | null {
  try {
    return window.sessionStorage.getItem(CLAVE);
  } catch {
    // Modo privado con el almacenamiento bloqueado. Se pierde la continuidad
    // tras recargar, que es degradar la función, no romperla.
    return null;
  }
}

/**
 * Se exportan las dos de abajo porque la pantalla de historial (HU-12) es la
 * otra cosa que decide cuál es la sesión activa: retomar una previa la escribe,
 * empezar una nueva la borra. La conversación se remonta después y la lee acá,
 * que es el único lugar que conoce la clave.
 */
export function recordarSesion(id: string): void {
  try {
    window.sessionStorage.setItem(CLAVE, id);
  } catch {
    // Ídem: la conversación de esta carga funciona igual.
  }
}

export function olvidarSesion(): void {
  try {
    window.sessionStorage.removeItem(CLAVE);
    // También los mensajes que no llegaron: lo que la persona escribió no puede quedar
    // en una pestaña de una computadora compartida después de salir (revisión del #68).
    for (const clave of Object.keys(window.sessionStorage)) {
      if (clave.startsWith(PREFIJO_NO_ENVIADO)) window.sessionStorage.removeItem(clave);
    }
  } catch {
    // Si no se pudo escribir, tampoco hay nada guardado que borrar.
  }
}

/**
 * El mensaje que no llegó a contestarse, por sesión, para que no se pierda al ir al
 * historial o recargar (recorrido del 22/11: salió de la pantalla y el mensaje no
 * estaba, sin aviso). En `sessionStorage`, como el resto de la conversación.
 */
function claveNoEnviado(sesionId: string): string {
  return `${PREFIJO_NO_ENVIADO}${sesionId}`;
}

function leerNoEnviado(sesionId: string): string | null {
  try {
    return window.sessionStorage.getItem(claveNoEnviado(sesionId));
  } catch {
    return null;
  }
}

function anotarNoEnviado(sesionId: string, texto: string | null): void {
  try {
    if (texto === null) window.sessionStorage.removeItem(claveNoEnviado(sesionId));
    else window.sessionStorage.setItem(claveNoEnviado(sesionId), texto);
  } catch {
    // Sin almacenamiento, el mensaje queda a la vista mientras dure esta carga.
  }
}

export const NO_LLEGO =
  "Este mensaje no llegó a contestarse. Podés reenviarlo tal cual, o escribir otro.";

/** Lo que se está escribiendo ahora mismo, todavía no confirmado por el backend. */
export interface TurnoEnCurso {
  usuario: string;
  agente: string;
}

export interface Conversacion {
  /** Hace falta para pedir la traza de una respuesta (HU-18). */
  sesionId: string;
  /**
   * Si al montar ya había una sesión guardada: se retomó desde Historial o se
   * recargó la página. Lo usa la pantalla para decir que se sigue una
   * conversación ya empezada y no se arranca otra (VOCAIA-222).
   */
  recuperada: boolean;
  /** Turnos confirmados. Vienen del backend, nunca se arman acá. */
  turnos: Turno[];
  enCurso: TurnoEnCurso | null;
  cargando: boolean;
  enviando: boolean;
  error: string | null;
  /**
   * Fuentes del corpus consultadas para la última respuesta.
   *
   * Duran lo que dura la carga de la página: el backend las emite en el evento
   * de cierre del streaming y no las persiste con el turno, así que después de
   * un F5 el historial vuelve sin ellas. Es una limitación conocida y no un
   * descuido —persistirlas es una tabla nueva—, pero significa que esto no se
   * puede usar como registro de trazabilidad: para eso está la evidencia.
   */
  fuentes: Fuente[];
  /** Intercambios completos: los turnos de la persona son el 1, el 3, el 5… */
  intercambios: number;
  /**
   * `abierta`, `cerrada` o `derivada`, según el backend; `null` antes del
   * primer mensaje. El evento `fin` del streaming no avisa el cierre, pero el
   * historial que se relee después de cada envío sí lo trae, así que no cuesta
   * un pedido más.
   */
  estado: string | null;
  /**
   * Si algún cierre dejó un informe (HU-16). No sale de `estado`: seguir
   * escribiendo reabre la sesión y el informe anterior se sigue pudiendo leer,
   * y recién cerrada todavía se está armando.
   */
  tieneInforme: boolean;
  /**
   * Si el último envío cerró esta parte sin que el perfil alcance para sugerir
   * carreras, lo que falta conocer (VOCAIA-214). `null` en cualquier otro caso:
   * el aviso de cierre dice entonces lo de siempre.
   */
  faltaParaRecomendar: string | null;
  /**
   * El último mensaje que no llegó a contestarse, para mostrarlo con su error y
   * reenviarlo. `null` si no hay ninguno.
   */
  noEnviado: string | null;
  enviar: (contenido: string) => Promise<void>;
  /** Cierra esta parte a pedido de la persona. Devuelve si cerró. */
  terminar: () => Promise<boolean>;
  /** Si el error a la vista es de «Terminar»: reintentar es volver a terminar. */
  errorAlTerminar: boolean;
  reintentar: () => void;
}

export function useConversacion(): Conversacion {
  // Se resuelve una sola vez por montaje: si se recalculara en cada render,
  // cada uno estrenaría una sesión distinta.
  const [sesion] = useState(() => {
    const guardada = sesionGuardada();
    return { id: guardada ?? crypto.randomUUID(), recuperada: guardada !== null };
  });

  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [enCurso, setEnCurso] = useState<TurnoEnCurso | null>(null);
  // Arranca cargando solo si hay algo que recuperar: para una sesión recién
  // creada el backend devolvería 404 y sería un viaje al servidor para
  // confirmar que no hay nada.
  const [cargando, setCargando] = useState(sesion.recuperada);
  const [enviando, setEnviando] = useState(false);
  const [fuentes, setFuentes] = useState<Fuente[]>([]);
  const [estado, setEstado] = useState<string | null>(null);
  const [tieneInforme, setTieneInforme] = useState(false);
  const [faltaParaRecomendar, setFaltaParaRecomendar] = useState<string | null>(null);
  // Cuántos turnos había en el último historial leído: dice si un envío cortado llegó.
  const cantidadDeTurnos = useRef(0);
  const [noEnviado, setNoEnviado] = useState<string | null>(() => leerNoEnviado(sesion.id));
  const [error, setError] = useState<string | null>(() =>
    leerNoEnviado(sesion.id) === null ? null : NO_LLEGO,
  );

  /**
   * Trae los turnos y nada más.
   *
   * Está separado de `cargar` por lo que *no* hace: no toca el error. Cuando el
   * refresco viene después de un streaming que se cortó, limpiar el error acá
   * borraría el aviso que la persona todavía no leyó.
   */
  const traer = useCallback(async () => {
    const historial = await obtenerHistorial(sesion.id);
    cantidadDeTurnos.current = historial?.turnos.length ?? 0;
    setTurnos(historial?.turnos ?? []);
    setEstado(historial?.estado ?? null);
    setTieneInforme(historial?.tiene_informe ?? false);
    // Del historial y no sólo del evento `fin`: al volver o recargar, el aviso de
    // cierre decía sólo «Podés ver tu informe» (recorrido del 22/11).
    setFaltaParaRecomendar(historial?.falta_para_recomendar ?? null);
    return historial;
  }, [sesion.id]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      await traer();
      setError((actual) => (actual === NO_LLEGO ? actual : null));
    } catch (fallo) {
      setError(describir(fallo));
    } finally {
      setCargando(false);
    }
  }, [traer]);

  useEffect(() => {
    if (sesion.recuperada) void cargar();
  }, [sesion.recuperada, cargar]);

  useEffect(() => alCambiarSesion((token) => token === null && olvidarSesion()), []);

  const enviar = useCallback(
    async (contenido: string) => {
      const texto = contenido.trim();
      if (texto === "" || enviando) return;

      // Se recuerda antes de mandar, no después: si la persona recarga a mitad
      // del streaming, el turno ya quedó persistido del otro lado y sin el
      // identificador guardado no habría forma de volver a encontrarlo.
      recordarSesion(sesion.id);
      const turnosAntes = cantidadDeTurnos.current;
      setEnCurso({ usuario: texto, agente: "" });
      setEnviando(true);
      setError(null);
      // Se limpian al empezar y no al terminar: las de la respuesta anterior no
      // respaldan la que se está por escribir.
      setFuentes([]);
      setFaltaParaRecomendar(null);
      setNoEnviado(null);
      anotarNoEnviado(sesion.id, null);
      let sinRespuesta = false;

      try {
        for await (const evento of enviarMensaje(sesion.id, texto)) {
          if ("delta" in evento) {
            setEnCurso((actual) =>
              actual === null ? actual : { ...actual, agente: actual.agente + evento.delta },
            );
          } else if ("fin" in evento) {
            // `?? []` porque la forma de los eventos SSE se declara a mano —el
            // esquema OpenAPI no la puede describir— y nada garantiza en
            // compilación que el backend del otro lado ya emita la clave.
            setFuentes(evento.fuentes ?? []);
            setFaltaParaRecomendar(
              evento.perfil_alcanza === false ? (evento.falta_para_recomendar ?? null) : null,
            );
          } else if ("error" in evento) {
            // El stream ya había arrancado, así que lo que se alcanzó a
            // mostrar sigue siendo válido: se avisa y se conserva.
            setError(evento.error);
            sinRespuesta = true;
          }
        }
        if (sinRespuesta) {
          setNoEnviado(texto);
          anotarNoEnviado(sesion.id, texto);
        }
        // El historial del backend es la fuente de verdad, incluida la
        // numeración de los turnos. Recargarlo acá es también lo que ejercita
        // el camino de HU-07 en cada envío y no solo al recargar la página.
        await traer();
        setEnCurso(null);
      } catch (fallo) {
        setEnCurso(null);
        setError(describir(fallo));
        // Con la sesión vencida no se guarda: ya se hizo la limpieza del cierre, y lo
        // escrito quedaría en el navegador sin nadie que lo borre (revisión del #68).
        if (fallo instanceof SesionVencida) return;
        // Si el backend llegó a contestarlo antes del corte, no se marca como perdido:
        // reenviarlo lo duplicaría.
        const historial = await traer().catch(() => null);
        // Con dos turnos nuevos y no sólo los dos últimos: un «sí» igual al anterior que
        // no llegó se daba por contestado con la respuesta vieja (revisión del #68).
        const ultimos = historial?.turnos.slice(-2) ?? [];
        const contestado =
          (historial?.turnos.length ?? 0) >= turnosAntes + 2 &&
          ultimos.length === 2 &&
          ultimos[0].rol === "usuario" &&
          ultimos[0].contenido === texto &&
          ultimos[1].rol === "agente";
        if (contestado) {
          setError(null);
          return;
        }
        // Queda a la vista con su error, para reenviarlo: si el backend lo había
        // guardado sin contestar, el reenvío lo contesta sin duplicarlo.
        setNoEnviado(texto);
        anotarNoEnviado(sesion.id, texto);
      } finally {
        setEnviando(false);
      }
    },
    [sesion.id, enviando, traer],
  );

  const [errorAlTerminar, setErrorAlTerminar] = useState(false);
  const terminar = useCallback(async () => {
    setError(null);
    setErrorAlTerminar(false);
    try {
      const historial = await terminarConversacion(sesion.id);
      setEstado(historial.estado);
      setTieneInforme(historial.tiene_informe);
      setFaltaParaRecomendar(historial.falta_para_recomendar ?? null);
      return true;
    } catch (fallo) {
      setError(describir(fallo));
      setErrorAlTerminar(true);
      return false;
    }
  }, [sesion.id]);

  const intercambios = turnos.filter((turno) => turno.rol === "usuario").length;

  return {
    sesionId: sesion.id,
    recuperada: sesion.recuperada,
    turnos,
    enCurso,
    cargando,
    enviando,
    error,
    fuentes,
    intercambios,
    estado,
    tieneInforme,
    faltaParaRecomendar,
    noEnviado,
    enviar,
    terminar,
    errorAlTerminar,
    // Con un mensaje sin contestar, reintentar es reenviarlo; si no, volver a cargar.
    reintentar: () => void (noEnviado !== null ? enviar(noEnviado) : cargar()),
  };
}
