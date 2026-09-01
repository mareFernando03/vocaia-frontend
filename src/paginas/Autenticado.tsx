/**
 * Qué ve quien ya ingresó: la conversación, o el listado de las anteriores.
 *
 * La conversación es la vista inicial y no el historial. Recargar en medio de
 * una charla tiene que devolver a la charla —es el criterio de HU-07—, así que
 * el listado es un desvío al que se entra a propósito y del que se vuelve.
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

interface Propiedades {
  alSalir: () => Promise<void>;
}

export default function Autenticado({ alSalir }: Propiedades) {
  const [enHistorial, setEnHistorial] = useState(false);
  const [epoca, setEpoca] = useState(0);

  function cambiarDeSesion(elegir: () => void) {
    elegir();
    setEpoca((anterior) => anterior + 1);
    setEnHistorial(false);
  }

  if (enHistorial) {
    return (
      <Historial
        alRetomar={(sesionId) => cambiarDeSesion(() => recordarSesion(sesionId))}
        alEmpezarNueva={() => cambiarDeSesion(olvidarSesion)}
        alVolver={() => setEnHistorial(false)}
      />
    );
  }

  return <Conversacion key={epoca} alSalir={alSalir} alVerHistorial={() => setEnHistorial(true)} />;
}
