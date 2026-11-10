import { Info } from "lucide-react";
import { useState } from "react";

import { useSesion } from "./auth/useSesion";
import { AvisoIA } from "./componentes/AvisoIA";
import { Logotipo } from "./componentes/Logotipo";
import { SelectorTema } from "./componentes/SelectorTema";
import { Boton } from "./componentes/ui/Boton";
import { Cargando } from "./componentes/ui/Cargando";
import { AVISO } from "./contenido/aviso-ia";
import { useAvisoAceptado } from "./hooks/useAvisoAceptado";
import { useTecladoVirtual } from "./hooks/useTecladoVirtual";
import { RanuraNavegacion } from "./lib/ranura-navegacion";
import Autenticado from "./paginas/Autenticado";
import Ingresar from "./paginas/Ingresar";

export default function App() {
  // La aceptación se olvida sola cuando se pierde la sesión, sea por «Salir»
  // o por un 401 (VOCAIA-102): no hace falta que «Salir» la borre aparte.
  const { aceptado, version, aceptar } = useAvisoAceptado();
  // Solo la versión vigente: mientras la puerta esté abierta no hay nada que
  // registrar, aunque quede guardada una versión anterior.
  const {
    sesion,
    error: errorDeIngreso,
    aviso: avisoDeIngreso,
    ingresar,
    salir,
    darDeBaja,
  } = useSesion(aceptado ? version : null);
  const [releyendo, setReleyendo] = useState(false);
  // El lugar de la barra donde `Autenticado` pone las pestañas. Es estado y no
  // una referencia: el elemento recién existe después del primer dibujo, y las
  // pestañas tienen que volver a dibujarse cuando aparece.
  const [ranura, setRanura] = useState<HTMLElement | null>(null);
  useTecladoVirtual();
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

        {/* Fija arriba, y siempre igual en todas las pantallas: el aviso de que
            es una IA, la forma de releerlo y el tema están en el mismo lugar
            haga lo que haga la persona (WCAG 3.2.6, ayuda consistente). En
            pantallas anchas, las pestañas van acá también.

            La divulgación es persistente, no solo inicial: la franja queda a la
            vista durante toda la sesión y el botón permite releer el aviso
            completo en cualquier momento (HU-02). Va afuera del ingreso a
            propósito: la puerta de HU-02 se atraviesa antes de identificarse,
            así que quien todavía no entró también lee de qué se trata.

            No se imprime: el informe lleva su propia salvedad, que en papel es
            la que tiene que quedar junto al contenido. */}
        <header className="border-border bg-surface/90 sticky top-0 z-30 border-b backdrop-blur print:hidden">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:h-16 sm:px-6">
            <Logotipo />
            <div ref={setRanura} className="hidden min-w-0 flex-1 justify-center sm:flex" />
            <div className="ms-auto flex shrink-0 items-center gap-1">
              <SelectorTema />
              {/* Solo después de aceptar: si se dibuja antes, se lo puede
                  accionar por teclado con la puerta abierta y la relectura
                  salta sola apenas se acepta. */}
              {aceptado && (
                <Boton variante="fantasma" onClick={() => setReleyendo(true)} className="px-3">
                  <Info aria-hidden="true" />
                  <span className="sr-only lg:not-sr-only">{AVISO.reabrir}</span>
                </Boton>
              )}
            </div>
          </div>
          <p className="border-border bg-primary-soft text-muted-foreground border-t px-4 py-1.5 text-center text-xs leading-snug sm:text-sm">
            Estás hablando con una{" "}
            <strong className="text-foreground font-semibold">inteligencia artificial</strong>. No
            reemplaza a un orientador vocacional.
          </p>
        </header>

        {/* `tabIndex={-1}` para que el enlace de salto pueda dejarle el foco:
            sin eso algunos navegadores hacen scroll pero el foco se queda
            arriba, y el siguiente Tab vuelve al principio. El relleno arranca
            en 4 y sube a 6 recién en pantallas anchas: a 360 px, 24 px por
            lado se comen el ancho de la conversación. */}
        <main
          id="contenido"
          tabIndex={-1}
          className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-4 pb-6 outline-none sm:px-6 sm:pt-8"
        >
          <RanuraNavegacion value={ranura}>
            <Contenido
              sesion={sesion}
              errorDeIngreso={errorDeIngreso}
              avisoDeIngreso={avisoDeIngreso}
              alIngresar={ingresar}
              alSalir={salir}
              alDarDeBaja={darDeBaja}
            />
          </RanuraNavegacion>
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
  errorDeIngreso: string | null;
  avisoDeIngreso: string | null;
  alIngresar: (token: string) => void;
  alSalir: () => Promise<void>;
  alDarDeBaja: () => Promise<void>;
}

/**
 * Qué se ve según el estado de la sesión (HU-01).
 *
 * Vive dentro del armazón de arriba y no lo reemplaza: la franja de
 * divulgación tiene que quedar a la vista en los tres estados.
 */
function Contenido({
  sesion,
  errorDeIngreso,
  avisoDeIngreso,
  alIngresar,
  alSalir,
  alDarDeBaja,
}: PropiedadesContenido) {
  if (sesion.estado === "verificando") {
    return <Cargando texto="Verificando la sesión…" className="m-auto" />;
  }

  if (sesion.estado === "anonimo") {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <Ingresar alIngresar={alIngresar} error={errorDeIngreso} aviso={avisoDeIngreso} />
      </div>
    );
  }

  // Acá termina el armazón y empieza la historia: el ingreso ya se resolvió,
  // el aviso ya se leyó, y lo que queda es la conversación (HU-06, HU-07).
  return <Autenticado alSalir={alSalir} alDarDeBaja={alDarDeBaja} />;
}
