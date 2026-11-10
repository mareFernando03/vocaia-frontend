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

import { ChevronRight, FileText, MessagesSquare, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { describir } from "../api/cliente";
import { listarSesiones, type ResumenSesion } from "../api/conversacion";
import { Boton } from "../componentes/ui/Boton";
import { Cargando } from "../componentes/ui/Cargando";
import { EncabezadoPagina } from "../componentes/ui/EncabezadoPagina";
import { ErrorConReintento } from "../componentes/ui/ErrorConReintento";
import { Tarjeta } from "../componentes/ui/Tarjeta";
import { fechaLarga } from "../lib/fechas";

interface Propiedades {
  alRetomar: (sesionId: string) => void;
  alEmpezarNueva: () => void;
  alVerInforme: (sesionId: string) => void;
}

export default function Historial({ alRetomar, alEmpezarNueva, alVerInforme }: Propiedades) {
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
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Tus conversaciones"
        acciones={
          <Boton variante="primario" onClick={alEmpezarNueva}>
            <Plus aria-hidden="true" />
            Empezar una conversación nueva
          </Boton>
        }
      />

      {cargando && <Cargando texto="Buscando tus conversaciones…" />}

      {error !== null && (
        <ErrorConReintento alReintentar={() => void cargar()}>{error}</ErrorConReintento>
      )}

      {!cargando && error === null && sesiones.length === 0 && (
        <div className="text-muted-foreground flex flex-col items-center gap-3 py-12 text-center">
          <MessagesSquare aria-hidden="true" className="size-10" strokeWidth={1.5} />
          <p>Todavía no hablaste con VocaIA.</p>
        </div>
      )}

      {sesiones.length > 0 && (
        <ul className="flex flex-col gap-3">
          {sesiones.map((sesion) => {
            const fecha = fechaLarga(sesion.actualizada_en);
            const intercambios = intercambiosDe(sesion.cantidad_turnos);
            return (
              <Tarjeta
                key={sesion.sesion_id}
                como="li"
                className="hover:border-input relative gap-2 transition-colors"
              >
                {/* La tarjeta entera retoma la conversación, pero el elemento
                    que lo hace es el botón: su área se estira sobre toda la
                    tarjeta con un pseudo-elemento (Inclusive Components,
                    «Cards»). Envolver la tarjeta en el botón haría que el lector
                    de pantalla leyera todo junto, y dejaría el botón del
                    informe adentro de otro botón, que no es HTML válido. */}
                <button
                  type="button"
                  onClick={() => alRetomar(sesion.sesion_id)}
                  className="flex w-full items-start gap-3 rounded-md text-left after:absolute after:inset-0 after:rounded-2xl after:content-['']"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    {/* Una sola cadena y no tres elementos con separadores
                        ocultos: el nombre accesible del boton concatena los
                        hijos sin espacios, asi que «2026» y «2 mensajes» se
                        pegaban y el lector de pantalla leia «20262 mensajes».
                        Intercambios, como en la charla: el backend cuenta los
                        turnos de las dos partes, y cada intercambio son dos (el
                        saludo suelto no suma). */}
                    <span className="text-muted-foreground text-sm">
                      {`${fecha} · ${intercambios} ${intercambios === 1 ? "intercambio" : "intercambios"}`}
                    </span>{" "}
                    {/* El espacio de arriba no se dibuja —flex descarta los
                        nodos de solo espacio— pero sí entra en el nombre
                        accesible, que si no leería «2 mensajesEstoy entre…». */}
                    {/* `line-clamp-2` y no un recorte en JavaScript: cuántas
                        palabras entran depende del ancho de la pantalla, que el
                        código no conoce y el navegador sí. */}
                    <span className="line-clamp-2">
                      {sesion.vista_previa ?? "Conversación sin mensajes tuyos todavía"}
                    </span>
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="text-muted-foreground mt-6 size-5 shrink-0"
                  />
                </button>
                {/* Al lado y no adentro del botón de retomar: un botón dentro
                    de otro no es HTML válido y el lector de pantalla leería los
                    dos nombres pegados. Va por encima del área estirada.

                    Recién cerrada todavía no tiene informe guardado, pero se
                    está armando y la pantalla del informe lo espera. El texto
                    visible es corto; el nombre accesible lleva la fecha porque
                    quien recorre los botones sueltos con el lector de pantalla
                    no ve a qué conversación pertenece cada uno. */}
                {(sesion.tiene_informe || sesion.estado === "cerrada") && (
                  <Boton
                    variante="secundario"
                    onClick={() => alVerInforme(sesion.sesion_id)}
                    aria-label={`Ver el informe de la conversación del ${fecha}`}
                    className="relative z-10 self-start"
                  >
                    <FileText aria-hidden="true" />
                    Ver informe
                  </Boton>
                )}
              </Tarjeta>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function intercambiosDe(turnos: number): number {
  return Math.floor(turnos / 2);
}
