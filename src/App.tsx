import { useState } from "react";

import { useSesion } from "./auth/useSesion";
import { AvisoIA } from "./componentes/AvisoIA";
import { AVISO } from "./contenido/aviso-ia";
import { useAvisoAceptado } from "./hooks/useAvisoAceptado";
import Ingresar from "./paginas/Ingresar";

export default function App() {
  const { aceptado, aceptar } = useAvisoAceptado();
  const { sesion, ingresar, salir } = useSesion();
  const [releyendo, setReleyendo] = useState(false);
  const hayDialogoAbierto = !aceptado || releyendo;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {/* `inert` saca todo el fondo del orden de tabulación y del árbol de
          accesibilidad mientras hay un diálogo abierto. Sin esto la puerta solo
          detiene al mouse y a Escape: con Tab se llega igual al contenido de
          atrás y, en cuanto la conversación exista, se podría escribir en ella
          sin haber visto la divulgación. Sería un control cosmético justo para
          los usuarios que tiene que proteger. */}
      <div inert={hayDialogoAbierto} className="flex flex-1 flex-col">
        {/* La divulgación es persistente, no solo inicial: la franja queda a la
            vista durante toda la sesión y el botón permite releer el aviso
            completo en cualquier momento (HU-02).

            La franja va afuera del ingreso a propósito: la puerta de HU-02 se
            atraviesa antes de identificarse, así que quien todavía no entró
            también lee de qué se trata el sistema. */}
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 p-4">
            <p className="text-sm text-slate-700">
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
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                {AVISO.reabrir}
              </button>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 p-6">
          <Contenido sesion={sesion} alIngresar={ingresar} alSalir={salir} />
        </main>
      </div>

      {/* Antes de la conversación, la puerta. Después, solo si la pide. */}
      {!aceptado && <AvisoIA modo="puerta" onAceptar={aceptar} />}
      {aceptado && releyendo && <AvisoIA modo="consulta" onCerrar={() => setReleyendo(false)} />}
    </div>
  );
}

interface PropiedadesContenido {
  sesion: ReturnType<typeof useSesion>["sesion"];
  alIngresar: (token: string) => void;
  alSalir: () => Promise<void>;
}

/**
 * Qué se ve según el estado de la sesión (HU-01).
 *
 * Vive dentro del armazón de arriba y no lo reemplaza: la franja de
 * divulgación tiene que quedar a la vista en los tres estados.
 */
function Contenido({ sesion, alIngresar, alSalir }: PropiedadesContenido) {
  if (sesion.estado === "verificando") {
    return <p className="text-sm text-slate-500">Verificando la sesión…</p>;
  }

  if (sesion.estado === "anonimo") {
    return <Ingresar alIngresar={alIngresar} />;
  }

  return (
    <div className="mx-auto w-full max-w-md text-center">
      <h1 className="text-2xl font-semibold">Ya estás dentro</h1>
      <p className="mt-2 text-sm text-slate-600">
        Todavía no hay conversación: eso llega con HU-06. Esta pantalla existe para comprobar que el
        ingreso funciona de punta a punta.
      </p>

      {/*
        Se muestra el identificador opaco a propósito, y no un nombre: es
        literalmente todo lo que el backend sabe decir sobre quién sos.
      */}
      <dl className="mt-6 rounded-lg bg-white p-4 text-left text-sm">
        <dt className="font-medium text-slate-700">Identificador opaco</dt>
        <dd className="mt-1 font-mono text-xs break-all text-slate-600">
          {sesion.usuario.identificador_opaco}
        </dd>
        <dt className="mt-3 font-medium text-slate-700">Proveedor</dt>
        <dd className="mt-1 text-slate-600">{sesion.usuario.proveedor}</dd>
      </dl>

      <button
        type="button"
        onClick={() => void alSalir()}
        className="mt-6 rounded-full border border-slate-300 px-5 py-2 text-sm hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
