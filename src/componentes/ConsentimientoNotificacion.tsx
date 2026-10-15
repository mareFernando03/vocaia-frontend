import { useCallback, useEffect, useRef, useState } from "react";

import { describir, SesionVencida } from "../api/cliente";
import {
  consultarNotificacion,
  otorgarNotificacion,
  revocarNotificacion,
  type Notificacion,
} from "../api/notificacion";
import { NOTIFICACION } from "../contenido/aviso-notificacion";

/**
 * Otorgar, consultar y revocar el aviso a la Facultad (HU-03b, HU-21).
 *
 * Es una sección y no una puerta: no hay nada que dependa de que esté
 * otorgado, y si falla al cargar se muestra el error acá sin tocar el resto de
 * la pantalla. Lo que se muestra es siempre lo que respondió el backend, no lo
 * que se acaba de pedir: si el registro no quedara, acá se vería.
 */
export function ConsentimientoNotificacion() {
  const [estado, setEstado] = useState<Notificacion | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // El estado de React llega tarde para frenar un doble clic; la ref no.
  const enviandoRef = useRef(false);

  const ejecutar = useCallback(async (pedido: () => Promise<Notificacion>) => {
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setEnviando(true);
    try {
      setEstado(await pedido());
      // El error se borra recién con la respuesta: si se borrara al empezar,
      // «Reintentar» —que existe porque hay error— se desmontaría en medio del
      // reintento y el foco de quien usa teclado caería al `body`.
      setError(null);
    } catch (fallo) {
      // La sesión vencida la resuelve App volviendo al ingreso.
      if (!(fallo instanceof SesionVencida)) setError(describir(fallo));
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }, []);

  useEffect(() => {
    void ejecutar(consultarNotificacion);
  }, [ejecutar]);

  // Antes de saber el estado no se ofrece ninguna acción: un «autorizar» sobre
  // un estado desconocido podría ser el contrario del que la persona cree estar
  // tocando. Si la consulta falló, lo único que se ofrece es reintentarla.
  const accion =
    estado === null
      ? error !== null && { texto: "Reintentar", pedido: consultarNotificacion, clases: SECUNDARIO }
      : estado.vigente
        ? { texto: NOTIFICACION.revocar, pedido: revocarNotificacion, clases: SECUNDARIO }
        : {
            texto: NOTIFICACION.otorgar,
            pedido: () => otorgarNotificacion(NOTIFICACION.version),
            clases: PRIMARIO,
          };

  return (
    <section
      aria-labelledby="notificacion-titulo"
      className="border-border bg-surface flex flex-col gap-3 rounded-md border p-4 text-sm"
    >
      <h2 id="notificacion-titulo" className="text-base font-semibold">
        {NOTIFICACION.titulo}
      </h2>
      <p>{NOTIFICACION.presentacion}</p>
      <dl className="flex flex-col gap-2">
        {NOTIFICACION.detalles.map(({ titulo, texto }) => (
          <div key={titulo}>
            <dt className="font-medium">{titulo}</dt>
            <dd>{texto}</dd>
          </div>
        ))}
      </dl>
      <p className="text-muted-foreground">{NOTIFICACION.opcional}</p>

      <p role="status" className="font-medium">
        {estado === null
          ? ""
          : estado.vigente && estado.otorgado_en
            ? `${NOTIFICACION.autorizado} ${fecha(estado.otorgado_en)}.`
            : NOTIFICACION.noAutorizado}
      </p>

      {error !== null && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}

      {accion && (
        <div>
          {/* Un solo botón que cambia de texto, y `aria-disabled` en vez de
              `disabled`: es el mismo nodo antes y después, y el foco de quien
              usa teclado no se cae al `body` al otorgar o revocar. */}
          <button
            type="button"
            aria-disabled={enviando}
            onClick={() => void ejecutar(accion.pedido)}
            className={`${accion.clases} inline-flex min-h-11 items-center rounded-md px-4 aria-disabled:opacity-50`}
          >
            {accion.texto}
          </button>
        </div>
      )}
    </section>
  );
}

const PRIMARIO = "bg-primary text-primary-foreground hover:bg-primary-light font-medium";
const SECUNDARIO = "border-input hover:bg-primary-soft border";

const FECHA = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long" });

function fecha(iso: string): string {
  return FECHA.format(new Date(iso));
}
