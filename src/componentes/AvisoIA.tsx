import { useEffect, useRef } from "react";

import { AVISO } from "../contenido/aviso-ia";

/**
 * Aviso de divulgación de que se conversa con una IA (HU-02, RF-11).
 *
 * Dos modos, porque los criterios de aceptación piden dos cosas distintas:
 *
 * - `puerta`: se muestra antes de iniciar la conversación y no se puede
 *   esquivar. No cierra con Escape ni con clic afuera; la única salida es leer
 *   y aceptar. Es un requisito de cumplimiento, no una cortesía.
 * - `consulta`: la relectura durante la sesión, que sí se cierra como cualquier
 *   diálogo. Cubre el criterio de que el aviso sea recuperable en todo momento.
 */

export type ModoAviso = "puerta" | "consulta";

export interface PropiedadesAvisoIA {
  modo: ModoAviso;
  /** Confirma la lectura. Solo se usa en modo `puerta`. */
  onAceptar?: () => void;
  /** Cierra la relectura. Solo se usa en modo `consulta`. */
  onCerrar?: () => void;
}

const CLASES_BOTON =
  "rounded-md px-5 py-2.5 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900";

export function AvisoIA({ modo, onAceptar, onCerrar }: PropiedadesAvisoIA) {
  const contenedor = useRef<HTMLDivElement>(null);
  const esPuerta = modo === "puerta";

  // Al abrir, el foco entra al diálogo. Sin esto, quien navega con teclado o
  // con lector de pantalla sigue parado en la página de atrás y el aviso, que
  // es lo único que importa en ese momento, le pasa desapercibido.
  useEffect(() => {
    contenedor.current?.focus();
  }, []);

  // Escape cierra la relectura, nunca la puerta.
  useEffect(() => {
    if (esPuerta || !onCerrar) return;
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", alPresionar);
    return () => document.removeEventListener("keydown", alPresionar);
  }, [esPuerta, onCerrar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4"
      // El fondo cierra la relectura; en la puerta no hace nada, que es la
      // diferencia entre un diálogo y un requisito.
      onClick={esPuerta ? undefined : onCerrar}
    >
      <div
        ref={contenedor}
        role="dialog"
        aria-modal="true"
        aria-labelledby="aviso-ia-titulo"
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl outline-none"
        onClick={(evento) => evento.stopPropagation()}
      >
        <h2 id="aviso-ia-titulo" className="text-xl font-semibold text-slate-900">
          {AVISO.titulo}
        </h2>

        <div className="mt-4 space-y-3 text-base leading-relaxed text-slate-800">
          {AVISO.parrafos.map((parrafo) => (
            <p key={parrafo}>{parrafo}</p>
          ))}
        </div>

        {/* Solo se dibuja si hay contactos reales cargados. Ver la nota de G-02
            en `contenido/aviso-ia.ts`: una sección de ayuda vacía es peor que
            ninguna. */}
        {AVISO.canales.length > 0 && (
          <section className="mt-5 rounded-md bg-slate-100 p-4">
            <h3 className="text-sm font-semibold text-slate-700">{AVISO.tituloAyuda}</h3>
            <ul className="mt-2 space-y-2 text-sm text-slate-800">
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
              className={`${CLASES_BOTON} bg-slate-900 text-white hover:bg-slate-700`}
            >
              {AVISO.aceptar}
            </button>
          ) : (
            <button
              type="button"
              onClick={onCerrar}
              className={`${CLASES_BOTON} border border-slate-300 text-slate-900 hover:bg-slate-100`}
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
