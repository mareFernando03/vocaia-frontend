import { useState } from "react";

import { useSesion } from "./auth/useSesion";
import { AvisoIA } from "./componentes/AvisoIA";
import { AVISO } from "./contenido/aviso-ia";
import { useAvisoAceptado } from "./hooks/useAvisoAceptado";
import Conversacion from "./paginas/Conversacion";
import Ingresar from "./paginas/Ingresar";

export default function App() {
  const { aceptado, aceptar } = useAvisoAceptado();
  const { sesion, ingresar, salir } = useSesion();
  const [releyendo, setReleyendo] = useState(false);
  const hayDialogoAbierto = !aceptado || releyendo;

  return (
    <div className="flex min-h-dvh flex-col">
      {/* `inert` saca todo el fondo del orden de tabulación y del árbol de
          accesibilidad mientras hay un diálogo abierto. Sin esto la puerta solo
          detiene al mouse y a Escape: con Tab se llega igual al contenido de
          atrás y, en cuanto la conversación exista, se podría escribir en ella
          sin haber visto la divulgación. Sería un control cosmético justo para
          los usuarios que tiene que proteger. */}
      <div inert={hayDialogoAbierto} className="flex flex-1 flex-col">
        {/* Enlace de salto (HU-08): primera parada del tabulador, invisible
            hasta que recibe el foco. Sin esto, quien navega con teclado tiene
            que recorrer la franja de divulgación y el botón de relectura en
            cada carga antes de llegar a la conversación. Va adentro del
            contenedor `inert` a propósito: con la puerta abierta no debe ser
            alcanzable, o sería una forma de saltearse el aviso. */}
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:bg-primary focus:text-primary-foreground focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-md focus:px-4 focus:font-medium"
        >
          Saltar al contenido
        </a>

        {/* La divulgación es persistente, no solo inicial: la franja queda a la
            vista durante toda la sesión y el botón permite releer el aviso
            completo en cualquier momento (HU-02).

            La franja va afuera del ingreso a propósito: la puerta de HU-02 se
            atraviesa antes de identificarse, así que quien todavía no entró
            también lee de qué se trata el sistema. */}
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
                className="border-input hover:bg-primary-soft inline-flex min-h-11 items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium"
              >
                {AVISO.reabrir}
              </button>
            )}
          </div>
        </header>

        {/* `tabIndex={-1}` para que el enlace de salto pueda dejarle el foco:
            sin eso algunos navegadores hacen scroll pero el foco se queda
            arriba, y el siguiente Tab vuelve al principio. El relleno arranca
            en 4 y sube a 6 recién en pantallas anchas: a 360 px, 24 px por
            lado se comen el ancho de la conversación. */}
        <main
          id="contenido"
          tabIndex={-1}
          className="mx-auto flex w-full max-w-3xl flex-1 flex-col p-4 outline-none sm:p-6"
        >
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
    return <p className="text-muted-foreground text-sm">Verificando la sesión…</p>;
  }

  if (sesion.estado === "anonimo") {
    return <Ingresar alIngresar={alIngresar} />;
  }

  // Acá termina el armazón y empieza la historia: el ingreso ya se resolvió,
  // el aviso ya se leyó, y lo que queda es la conversación (HU-06, HU-07).
  return <Conversacion alSalir={alSalir} />;
}
