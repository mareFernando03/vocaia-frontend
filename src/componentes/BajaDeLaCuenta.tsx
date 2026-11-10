/**
 * Dar de baja la cuenta (HU-04, S6-03 · VOCAIA-187).
 *
 * En dos pasos, sin `window.confirm`: un diálogo del navegador no se puede
 * redactar ni probar, y lo que tiene que quedar claro es justamente qué se
 * borra. Termine o no, la sesión se cierra y la aplicación vuelve al ingreso,
 * que dice qué pasó: el backend corta la credencial antes de borrar, así que un
 * reintento desde acá no llegaría (ver `useSesion`). El error de abajo queda
 * para un rechazo que no venga de ahí.
 */

import { useEffect, useRef, useState } from "react";

import { describir } from "../api/cliente";
import { BAJA } from "../contenido/baja";
import { clasesBoton } from "./ui/clases-boton";

interface Propiedades {
  alDarDeBaja: () => Promise<void>;
}

type Paso = "inicio" | "confirmando" | "borrando";

export function BajaDeLaCuenta({ alDarDeBaja }: Propiedades) {
  const [paso, setPaso] = useState<Paso>("inicio");
  const [error, setError] = useState<string | null>(null);
  const [fallos, setFallos] = useState(0);
  const preguntaRef = useRef<HTMLParagraphElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const [volverAlBoton, setVolverAlBoton] = useState(false);

  // Al pedir la confirmación, el foco va a la pregunta para que se lea antes que
  // los botones; al cancelar, vuelve al botón que la abrió.
  useEffect(() => {
    if (paso === "confirmando") preguntaRef.current?.focus();
    if (paso === "inicio" && volverAlBoton) botonRef.current?.focus();
  }, [paso, volverAlBoton]);

  async function confirmar() {
    setPaso("borrando");
    setError(null);
    try {
      await alDarDeBaja();
    } catch (fallo) {
      setError(describir(fallo));
      setFallos((anterior) => anterior + 1);
      setPaso("confirmando");
    }
  }

  return (
    <section
      aria-labelledby="baja-titulo"
      className="border-border bg-surface shadow-tarjeta flex flex-col gap-3 rounded-2xl border p-4 text-sm sm:p-5"
    >
      <h2 id="baja-titulo" className="text-base font-semibold">
        {BAJA.titulo}
      </h2>
      <p>{BAJA.explicacion}</p>
      <p className="text-muted-foreground">{BAJA.respaldo}</p>

      {paso === "inicio" ? (
        <div>
          <button
            ref={botonRef}
            type="button"
            onClick={() => setPaso("confirmando")}
            className={clasesBoton("peligro-fantasma", "-ms-3")}
          >
            {BAJA.boton}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p ref={preguntaRef} tabIndex={-1} className="font-medium outline-none">
            {BAJA.pregunta}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void confirmar()}
              disabled={paso === "borrando"}
              className={clasesBoton("peligro")}
            >
              {paso === "borrando" ? BAJA.borrando : BAJA.confirmar}
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setVolverAlBoton(true);
                setPaso("inicio");
              }}
              disabled={paso === "borrando"}
              className={clasesBoton("secundario")}
            >
              {BAJA.cancelar}
            </button>
          </div>
        </div>
      )}

      {error !== null && (
        <p key={fallos} role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
