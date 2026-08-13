import { useState } from "react";

import { AvisoIA } from "./componentes/AvisoIA";
import { AVISO } from "./contenido/aviso-ia";
import { useAvisoAceptado } from "./hooks/useAvisoAceptado";

export default function App() {
  const { aceptado, aceptar } = useAvisoAceptado();
  const [releyendo, setReleyendo] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {/* La divulgación es persistente, no solo inicial: la franja queda a la
          vista durante toda la sesión y el botón permite releer el aviso
          completo en cualquier momento (HU-02). */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 p-4">
          <p className="text-sm text-slate-700">
            Estás hablando con una <strong className="font-semibold">inteligencia artificial</strong>
            . No reemplaza a un orientador vocacional.
          </p>
          <button
            type="button"
            onClick={() => setReleyendo(true)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            {AVISO.reabrir}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 p-6">
        {/* Acá va la conversación (HU-06). Todavía no existe: el espacio queda
            reservado para no acoplar el aviso a una interfaz que está
            construyendo otra persona. */}
        <p className="text-sm text-slate-500">La conversación todavía no está implementada.</p>
      </main>

      {/* Antes de la conversación, la puerta. Después, solo si la pide. */}
      {!aceptado && <AvisoIA modo="puerta" onAceptar={aceptar} />}
      {aceptado && releyendo && <AvisoIA modo="consulta" onCerrar={() => setReleyendo(false)} />}
    </div>
  );
}
