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

import { useCallback, useEffect, useState } from "react";

import { ErrorDeApi, SesionVencida } from "../api/cliente";
import { enviarMensaje, type Fuente, obtenerHistorial, type Turno } from "../api/conversacion";
import { alCambiarSesion } from "../auth/sesion";

const CLAVE = "vocaia:conversacion:sesion";

function sesionGuardada(): string | null {
  try {
    return window.sessionStorage.getItem(CLAVE);
  } catch {
    // Modo privado con el almacenamiento bloqueado. Se pierde la continuidad
    // tras recargar, que es degradar la función, no romperla.
    return null;
  }
}

function recordarSesion(id: string): void {
  try {
    window.sessionStorage.setItem(CLAVE, id);
  } catch {
    // Ídem: la conversación de esta carga funciona igual.
  }
}

function olvidarSesion(): void {
  try {
    window.sessionStorage.removeItem(CLAVE);
  } catch {
    // Si no se pudo escribir, tampoco hay nada guardado que borrar.
  }
}

/** Lo que se está escribiendo ahora mismo, todavía no confirmado por el backend. */
export interface TurnoEnCurso {
  usuario: string;
  agente: string;
}

export interface Conversacion {
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
  enviar: (contenido: string) => Promise<void>;
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
  const [error, setError] = useState<string | null>(null);
  const [fuentes, setFuentes] = useState<Fuente[]>([]);

  /**
   * Trae los turnos y nada más.
   *
   * Está separado de `cargar` por lo que *no* hace: no toca el error. Cuando el
   * refresco viene después de un streaming que se cortó, limpiar el error acá
   * borraría el aviso que la persona todavía no leyó.
   */
  const traer = useCallback(async () => {
    const historial = await obtenerHistorial(sesion.id);
    setTurnos(historial?.turnos ?? []);
  }, [sesion.id]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      await traer();
      setError(null);
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
      setEnCurso({ usuario: texto, agente: "" });
      setEnviando(true);
      setError(null);
      // Se limpian al empezar y no al terminar: las de la respuesta anterior no
      // respaldan la que se está por escribir.
      setFuentes([]);

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
          } else if ("error" in evento) {
            // El stream ya había arrancado, así que lo que se alcanzó a
            // mostrar sigue siendo válido: se avisa y se conserva.
            setError(evento.error);
          }
        }
        // El historial del backend es la fuente de verdad, incluida la
        // numeración de los turnos. Recargarlo acá es también lo que ejercita
        // el camino de HU-07 en cada envío y no solo al recargar la página.
        await traer();
        setEnCurso(null);
      } catch (fallo) {
        setError(describir(fallo));
      } finally {
        setEnviando(false);
      }
    },
    [sesion.id, enviando, traer],
  );

  const intercambios = turnos.filter((turno) => turno.rol === "usuario").length;

  return {
    turnos,
    enCurso,
    cargando,
    enviando,
    error,
    fuentes,
    intercambios,
    enviar,
    reintentar: () => void cargar(),
  };
}

function describir(fallo: unknown): string {
  if (fallo instanceof SesionVencida) return fallo.message;
  if (fallo instanceof ErrorDeApi) return fallo.message;
  // Un fallo de red no trae nada legible: `TypeError: Failed to fetch` no le
  // dice nada a nadie.
  return "No se pudo conectar con el servidor. Revisá tu conexión y probá de nuevo.";
}
