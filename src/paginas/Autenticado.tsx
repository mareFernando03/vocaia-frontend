/**
 * Qué ve quien ya ingresó: la charla, el historial, las carreras o su perfil,
 * con las pestañas para ir de una a otra.
 *
 * La charla es la vista inicial. Recargar en medio de una tiene que devolver a
 * ella —es el criterio de HU-07—, así que la sección elegida no se guarda: un
 * F5 siempre vuelve a la charla.
 *
 * `epoca` fuerza a que la conversación se vuelva a montar cuando cambia cuál es
 * la sesión activa. Es lo que evita tener dos maneras de cargar un historial:
 * montada de nuevo, la conversación lee el identificador guardado igual que
 * después de un F5, y no necesita enterarse de que existe una pantalla que lo
 * cambia. Sin esto habría que agregarle al hook un camino de recarga que sólo
 * usaría el historial, y sería el que se rompa sin que nadie lo note.
 */

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { Navegacion, type Seccion } from "../componentes/Navegacion";
import { cn } from "../lib/cn";
import { useRanuraNavegacion } from "../lib/ranura-navegacion";
import { useAvisoPreguntado } from "../hooks/useAvisoPreguntado";
import { olvidarSesion, recordarSesion } from "../hooks/useConversacion";
import Carreras from "./Carreras";
import Conversacion from "./Conversacion";
import Historial from "./Historial";
import Informe from "./Informe";
import Perfil from "./Perfil";
import PreguntaAviso from "./PreguntaAviso";

interface Propiedades {
  alSalir: () => Promise<void>;
  alDarDeBaja: () => Promise<void>;
  correoDeIngreso?: string;
}

export default function Autenticado({ alSalir, alDarDeBaja, correoDeIngreso }: Propiedades) {
  const [seccion, setSeccion] = useState<Seccion>("charla");
  const [epoca, setEpoca] = useState(0);
  // El informe va aparte de la sección porque se abre encima de la pantalla de
  // la que se vino: al cerrarlo, la sección sigue ahí y se vuelve al historial
  // o a la charla sin tener que recordar cuál era.
  const [informe, setInforme] = useState<string | null>(null);
  // Antes de la primera conversación del ingreso, la pregunta por el aviso a
  // la Facultad (S7-12). Mientras está pendiente no hay pestañas: así nadie
  // llega a otra sección sin haber pasado por ella.
  const { preguntado, marcar } = useAvisoPreguntado();
  // Si la consulta falló se sigue sin marcar: la pregunta no se da por hecha.
  const [sinConsulta, setSinConsulta] = useState(false);
  const ranura = useRanuraNavegacion();

  function cambiarDeSesion(elegir: () => void) {
    elegir();
    setEpoca((anterior) => anterior + 1);
    setSeccion("charla");
  }

  function elegir(nueva: Seccion) {
    setInforme(null);
    setSeccion(nueva);
  }

  // La página entera es la que se desplaza, así que al cambiar de pantalla
  // quedaba en la altura de la anterior: se entraba al perfil por la mitad. La
  // charla no lo necesita, porque baja sola hasta el último mensaje.
  useEffect(() => {
    window.scrollTo?.({ top: 0 });
  }, [seccion, informe]);

  if (!preguntado && !sinConsulta) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <PreguntaAviso alSeguir={marcar} alFallarLaConsulta={() => setSinConsulta(true)} />
      </div>
    );
  }

  let pantalla: ReactNode;
  if (informe !== null) {
    pantalla = <Informe sesionId={informe} alVolver={() => setInforme(null)} />;
  } else if (seccion === "historial") {
    pantalla = (
      <Historial
        alRetomar={(sesionId) => cambiarDeSesion(() => recordarSesion(sesionId))}
        alEmpezarNueva={() => cambiarDeSesion(olvidarSesion)}
        alVerInforme={setInforme}
      />
    );
  } else if (seccion === "perfil") {
    pantalla = (
      <Perfil alSalir={alSalir} alDarDeBaja={alDarDeBaja} correoDeIngreso={correoDeIngreso} />
    );
  } else if (seccion === "carreras") {
    pantalla = <Carreras />;
  } else {
    pantalla = <Conversacion key={epoca} alVerInforme={setInforme} />;
  }

  // Carreras es una grilla de fichas y aprovecha el ancho; lo demás se lee de
  // corrido, y una línea de más de unos 70 caracteres se vuelve difícil de
  // seguir.
  const ancha = informe === null && seccion === "carreras";

  return (
    // Abajo deja lugar para la barra de pestañas del teléfono, que es fija: sin
    // esto, el final de cada pantalla queda tapado por ella.
    <div
      className={cn(
        "mx-auto flex w-full flex-1 flex-col pb-20 sm:pb-0",
        ancha ? "max-w-6xl" : "max-w-3xl",
      )}
    >
      <Navegacion variante="inferior" activa={seccion} alElegir={elegir} />
      {ranura !== null &&
        createPortal(<Navegacion variante="superior" activa={seccion} alElegir={elegir} />, ranura)}
      {pantalla}
    </div>
  );
}
