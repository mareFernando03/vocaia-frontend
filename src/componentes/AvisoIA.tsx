import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from "react";

import { AVISO } from "../contenido/aviso-ia";

/**
 * Aviso de divulgación de que se conversa con una IA (HU-02, RF-11).
 *
 * Dos modos, porque los criterios de aceptación piden dos cosas distintas:
 *
 * - `puerta`: se muestra antes de iniciar la conversación y no se puede
 *   esquivar. No cierra con Escape ni con clic afuera, y el foco no sale del
 *   diálogo. Es un requisito de cumplimiento, no una cortesía.
 * - `consulta`: la relectura durante la sesión, que sí se cierra como cualquier
 *   diálogo. Cubre el criterio de que el aviso sea recuperable en todo momento.
 *
 * Las propiedades son una unión discriminada por `modo`: cada modo tiene una
 * sola salida y depende de su propio callback, así que dejarlos opcionales
 * permitía construir un diálogo del que no se podía salir.
 */

export type ModoAviso = "puerta" | "consulta";

export type PropiedadesAvisoIA =
  | { modo: "puerta"; onAceptar: () => void; onCerrar?: never }
  | { modo: "consulta"; onCerrar: () => void; onAceptar?: never };

const FOCALIZABLES = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const CLASES_BOTON = "rounded-md px-5 py-2.5 font-medium";

export function AvisoIA({ modo, onAceptar, onCerrar }: PropiedadesAvisoIA) {
  const contenedor = useRef<HTMLDivElement>(null);
  const focoPrevio = useRef<HTMLElement | null>(null);
  const esPuerta = modo === "puerta";

  // El foco entra al diálogo al abrirse y vuelve a su origen al cerrarse. Sin
  // lo primero, quien navega con teclado sigue parado en la página de atrás y
  // el aviso le pasa desapercibido; sin lo segundo, al cerrar queda tirado en
  // el `body` y tiene que recorrer la página entera de nuevo.
  useEffect(() => {
    focoPrevio.current = document.activeElement as HTMLElement | null;
    contenedor.current?.focus();
    return () => focoPrevio.current?.focus?.();
  }, []);

  // Escape cierra la relectura, nunca la puerta.
  useEffect(() => {
    if (esPuerta || !onCerrar) return;
    const alPresionar = (evento: globalThis.KeyboardEvent) => {
      if (evento.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", alPresionar);
    return () => document.removeEventListener("keydown", alPresionar);
  }, [esPuerta, onCerrar]);

  /**
   * Tab circula dentro del diálogo y no se va afuera.
   *
   * El fondo va marcado `inert` desde `App`, pero eso solo lo saca del orden de
   * tabulación de la página: sin este ciclo el foco se escapa igual a la barra
   * del navegador y vuelve por detrás del diálogo.
   */
  const alTabular = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (evento.key !== "Tab" || !contenedor.current) return;

    const focalizables = Array.from(contenedor.current.querySelectorAll<HTMLElement>(FOCALIZABLES));
    if (focalizables.length === 0) return;

    const primero = focalizables[0];
    const ultimo = focalizables[focalizables.length - 1];
    const activo = document.activeElement;

    if (evento.shiftKey && (activo === primero || activo === contenedor.current)) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && activo === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  };

  /**
   * Cierra la relectura solo si la pulsación empezó *y* terminó en el fondo.
   *
   * Mirar solo el `click` no alcanza, y frenar la propagación adentro tampoco:
   * si el mousedown cae en el panel y el mouseup en el fondo —seleccionar una
   * frase para copiarla, o arrastrar de más al scrollear—, el navegador dispara
   * el `click` sobre el ancestro común, que es el fondo. Con cualquiera de esas
   * dos defensas el diálogo se cierra en mitad de la lectura, así que hay que
   * recordar dónde empezó.
   */
  const empezoEnElFondo = useRef(false);

  const alPresionarElFondo = (evento: MouseEvent<HTMLDivElement>) => {
    empezoEnElFondo.current = evento.target === evento.currentTarget;
  };

  const alClickearElFondo = (evento: MouseEvent<HTMLDivElement>) => {
    const termino = evento.target === evento.currentTarget;
    const empezo = empezoEnElFondo.current;
    empezoEnElFondo.current = false;
    if (esPuerta || !empezo || !termino) return;
    onCerrar?.();
  };

  return (
    <div
      className="bg-foreground/70 fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={alPresionarElFondo}
      onClick={alClickearElFondo}
    >
      <div
        ref={contenedor}
        role="dialog"
        aria-modal="true"
        aria-labelledby="aviso-ia-titulo"
        tabIndex={-1}
        onKeyDown={alTabular}
        className="bg-surface max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg p-6 shadow-xl outline-none"
      >
        <h2 id="aviso-ia-titulo" className="text-xl font-semibold">
          {AVISO.titulo}
        </h2>

        <div className="mt-4 space-y-3 text-base leading-relaxed">
          {AVISO.parrafos.map((parrafo) => (
            <p key={parrafo}>{parrafo}</p>
          ))}
        </div>

        {/* Solo se dibuja si hay contactos reales cargados. Ver la nota de G-02
            en `contenido/aviso-ia.ts`: una sección de ayuda vacía es peor que
            ninguna. */}
        {AVISO.canales.length > 0 && (
          <section className="bg-primary-soft mt-5 rounded-md p-4">
            <h3 className="text-sm font-semibold">{AVISO.tituloAyuda}</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {AVISO.canales.map((canal) => (
                <li key={canal.nombre}>
                  <span className="font-medium">{canal.nombre}</span>{" "}
                  {canal.href ? (
                    <a className="underline underline-offset-2" href={canal.href}>
                      {canal.detalle}
                    </a>
                  ) : (
                    <span>{canal.detalle}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-6 flex justify-end">
          {esPuerta ? (
            <button
              type="button"
              onClick={onAceptar}
              className={`${CLASES_BOTON} bg-primary text-primary-foreground hover:bg-primary-light`}
            >
              {AVISO.aceptar}
            </button>
          ) : (
            <button
              type="button"
              onClick={onCerrar}
              className={`${CLASES_BOTON} border-input hover:bg-primary-soft border`}
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
