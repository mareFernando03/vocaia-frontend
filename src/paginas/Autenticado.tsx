/**
 * Qué ve quien ya ingresó: la conversación, el listado de las anteriores, o
 * su perfil.
 *
 * La conversación es la vista inicial, y el historial y el perfil son desvíos
 * a los que se entra a propósito y de los que se vuelve. Recargar en medio de
 * una charla tiene que devolver a la charla —es el criterio de HU-07—, y eso
 * descarta que los tres destinos estén al mismo nivel.
 *
 * `epoca` fuerza a que la conversación se vuelva a montar cuando cambia cuál es
 * la sesión activa. Es lo que evita tener dos maneras de cargar un historial:
 * montada de nuevo, la conversación lee el identificador guardado igual que
 * después de un F5, y no necesita enterarse de que existe una pantalla que lo
 * cambia. Sin esto habría que agregarle al hook un camino de recarga que sólo
 * usaría el historial, y sería el que se rompa sin que nadie lo note.
 */

import { useState } from "react";

import { olvidarSesion, recordarSesion } from "../hooks/useConversacion";
import Conversacion from "./Conversacion";
import Historial from "./Historial";
import Perfil from "./Perfil";

interface Propiedades {
  alSalir: () => Promise<void>;
}

type Desvio = "historial" | "perfil";

export default function Autenticado({ alSalir }: Propiedades) {
  const [desvio, setDesvio] = useState<Desvio | null>(null);
  const [epoca, setEpoca] = useState(0);

  function cambiarDeSesion(elegir: () => void) {
    elegir();
    setEpoca((anterior) => anterior + 1);
    setDesvio(null);
  }

  if (desvio === "historial") {
    return (
      <Historial
        alRetomar={(sesionId) => cambiarDeSesion(() => recordarSesion(sesionId))}
        alEmpezarNueva={() => cambiarDeSesion(olvidarSesion)}
        alVolver={() => setDesvio(null)}
      />
    );
  }

  if (desvio === "perfil") {
    return <Perfil alVolver={() => setDesvio(null)} />;
  }

  return (
    <Conversacion
      key={epoca}
      alSalir={alSalir}
      alVerHistorial={() => setDesvio("historial")}
      alVerPerfil={() => setDesvio("perfil")}
    />
  );
}
