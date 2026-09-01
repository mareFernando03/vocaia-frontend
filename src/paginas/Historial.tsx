/**
 * Pantalla de historial de sesiones (HU-12).
 *
 * Es lo que hace que una conversación se pueda retomar otro día: hasta acá el
 * identificador de sesión vivía sólo en el `sessionStorage` de la pestaña, así
 * que cerrarla era perder el hilo aunque los turnos siguieran guardados del
 * otro lado. El listado lo trae el backend a partir de la credencial, que es lo
 * único que sobrevive a la pestaña.
 *
 * Retomar una sesión no carga nada acá: escribe cuál es la activa y deja que la
 * conversación se monte de nuevo y la lea. Es el mismo camino que ya recorre un
 * F5, así que no hay una segunda forma de recuperar un historial que pueda
 * quedar desincronizada de la primera.
 */

import { useCallback, useEffect, useState } from "react";

import { describir } from "../api/cliente";
import { listarSesiones, type ResumenSesion } from "../api/conversacion";

interface Propiedades {
  alRetomar: (sesionId: string) => void;
  alEmpezarNueva: () => void;
  alVolver: () => void;
}

const FECHA = new Intl.DateTimeFormat("es-AR", { dateStyle: "long" });

export default function Historial({ alRetomar, alEmpezarNueva, alVolver }: Propiedades) {
  const [sesiones, setSesiones] = useState<ResumenSesion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setSesiones(await listarSesiones());
      setError(null);
    } catch (fallo) {
      setError(describir(fallo));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => void cargar(), [cargar]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-xl font-semibold">Tus conversaciones</h1>
        <button
          type="button"
          onClick={alVolver}
          className="border-input hover:bg-primary-soft inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm"
        >
          Volver
        </button>
      </div>

      {cargando && <p className="text-muted-foreground text-sm">Buscando tus conversaciones…</p>}

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

      {!cargando && error === null && sesiones.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Todavía no hablaste con VocaIA. Cuando lo hagas, la conversación va a quedar acá para que
          puedas retomarla otro día.
        </p>
      )}

      {sesiones.length > 0 && (
        <ul className="flex flex-1 flex-col gap-3 overflow-y-auto">
          {sesiones.map((sesion) => (
            <li key={sesion.sesion_id}>
              {/* El item entero es el botón y no un enlace con un botón adentro:
                  no hay ruteo, y un blanco de un solo objetivo se acierta con el
                  dedo y se anuncia una sola vez con el lector de pantalla. */}
              <button
                type="button"
                onClick={() => alRetomar(sesion.sesion_id)}
                // El hover va al fondo y no a `primary-soft` como el resto de
                // los botones neutros: la fecha y el conteo son texto
                // secundario, y sobre `primary-soft` ese par da 4,44:1, abajo
                // del 4,5 que pide WCAG AA. Sobre el fondo da 4,63:1, que es
                // uno de los pares que `verificar-contraste` ya mide.
                className="border-border bg-surface hover:bg-background flex w-full flex-col items-start gap-1 rounded-md border p-3 text-left"
              >
                {/* Una sola cadena y no tres elementos con separadores
                    ocultos: el nombre accesible del boton concatena los hijos
                    sin espacios, asi que «2026» y «2 mensajes» se pegaban y el
                    lector de pantalla leia «20262 mensajes». Mensajes y no
                    intercambios: el backend cuenta los turnos de las dos partes
                    y aca no hay forma de separarlos. */}
                <span className="text-muted-foreground text-sm">
                  {`${FECHA.format(new Date(sesion.actualizada_en))} · ${sesion.cantidad_turnos} ${
                    sesion.cantidad_turnos === 1 ? "mensaje" : "mensajes"
                  }`}
                </span>{" "}
                {/* El espacio de arriba no se dibuja —flex descarta los nodos
                    de solo espacio— pero sí entra en el nombre accesible, que
                    si no leería «2 mensajesEstoy entre…». */}
                {/* `line-clamp-2` y no un recorte en JavaScript: cuántas
                    palabras entran depende del ancho de la pantalla, que el
                    código no conoce y el navegador sí. */}
                <span className="line-clamp-2 text-sm">
                  {sesion.vista_previa ?? "Conversación sin mensajes tuyos todavía"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={alEmpezarNueva}
        className="bg-primary text-primary-foreground inline-flex min-h-11 items-center justify-center self-start rounded-md px-4 text-sm font-medium"
      >
        Empezar una conversación nueva
      </button>
    </div>
  );
}
