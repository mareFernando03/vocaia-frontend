import { useState } from "react";

import { AvisoIA } from "./componentes/AvisoIA";
import { AVISO } from "./contenido/aviso-ia";
import { useAvisoAceptado } from "./hooks/useAvisoAceptado";

export default function App() {
  const { aceptado, aceptar } = useAvisoAceptado();
  const [releyendo, setReleyendo] = useState(false);
  const hayDialogoAbierto = !aceptado || releyendo;

  return (
    <div className="flex min-h-screen flex-col">
      {/* `inert` saca todo el fondo del orden de tabulación y del árbol de
          accesibilidad mientras hay un diálogo abierto. Sin esto la puerta solo
          detiene al mouse y a Escape: con Tab se llega igual al contenido de
          atrás y, en cuanto la conversación exista, se podría escribir en ella
          sin haber visto la divulgación. Sería un control cosmético justo para
          los usuarios que tiene que proteger. */}
      <div inert={hayDialogoAbierto} className="flex flex-1 flex-col">
        {/* La divulgación es persistente, no solo inicial: la franja queda a la
            vista durante toda la sesión y el botón permite releer el aviso
            completo en cualquier momento (HU-02). */}
        <header className="border-border bg-surface border-b">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 p-4">
            <p className="text-sm">
              Estás hablando con una{" "}
              <strong className="font-semibold">inteligencia artificial</strong>. No reemplaza a un
              orientador vocacional.
            </p>
            {/* Solo después de aceptar: si se dibuja antes, se lo puede
                accionar por teclado con la puerta abierta y la relectura salta
                sola apenas se acepta. */}
            {aceptado && (
              <button
                type="button"
                onClick={() => setReleyendo(true)}
                className="border-input hover:bg-primary-soft rounded-md border px-3 py-1.5 text-sm font-medium"
              >
                {AVISO.reabrir}
              </button>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 p-6">
          {/* Acá va la conversación (HU-06). Todavía no existe: el espacio
              queda reservado para no acoplar el aviso a una interfaz que está
              construyendo otra persona. */}
          <p className="text-muted-foreground text-sm">
            La conversación todavía no está implementada.
          </p>
        </main>
      </div>

      {/* Antes de la conversación, la puerta. Después, solo si la pide. */}
      {!aceptado && <AvisoIA modo="puerta" onAceptar={aceptar} />}
      {aceptado && releyendo && <AvisoIA modo="consulta" onCerrar={() => setReleyendo(false)} />}
    </div>
  );
}
