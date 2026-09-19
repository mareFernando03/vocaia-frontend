/**
 * El texto que escribe el agente, que viene en markdown (VOCAIA-132).
 *
 * El encuadre de apertura vive en el backend como `recursos/prompts/encuadre-v1.md`
 * y llega con `**negrita**` y con los renglones cortados a mano, que es como se
 * escribe un archivo para leerlo en el editor. Mostrado como texto preformateado
 * se lee con los asteriscos a la vista y cortado donde lo cortó el archivo, que
 * no es donde termina la pantalla de quien lee.
 *
 * Se interpreta un subconjunto mínimo y a propósito: párrafos y negrita. No hay
 * enlaces ni HTML, así que no hay nada que sanear —React escapa todo lo que no
 * sean los dos nodos que arma esto— y cualquier otra marca que aparezca se
 * muestra tal cual en vez de desaparecer de la pantalla.
 *
 * **Lo que escribe la persona no pasa por acá.** Su mensaje se muestra como lo
 * escribió: si puso asteriscos, quiso poner asteriscos.
 */

import type { ReactNode } from "react";

/** Un párrafo termina donde hay un renglón en blanco, como en markdown. */
const CORTE_DE_PARRAFO = /\n\s*\n/;

/** Adentro de un párrafo, el corte de renglón es del archivo y no del texto. */
const CORTE_DE_RENGLON = /\s*\n\s*/g;

const NEGRITA = /\*\*(.+?)\*\*/g;

function enfatizar(parrafo: string): ReactNode[] {
  const nodos: ReactNode[] = [];
  let desde = 0;
  // `exec` en bucle para quedarnos con las posiciones: hacen de clave y evitan
  // numerar los pedazos por separado.
  for (
    let coincidencia = NEGRITA.exec(parrafo);
    coincidencia !== null;
    coincidencia = NEGRITA.exec(parrafo)
  ) {
    if (coincidencia.index > desde) nodos.push(parrafo.slice(desde, coincidencia.index));
    nodos.push(<strong key={coincidencia.index}>{coincidencia[1]}</strong>);
    desde = NEGRITA.lastIndex;
  }
  NEGRITA.lastIndex = 0;
  if (desde < parrafo.length) nodos.push(parrafo.slice(desde));
  return nodos;
}

export function Prosa({ texto }: { texto: string }) {
  const parrafos = texto
    .split(CORTE_DE_PARRAFO)
    .map((parrafo) => parrafo.replace(CORTE_DE_RENGLON, " ").trim())
    .filter((parrafo) => parrafo !== "");

  return (
    <>
      {parrafos.map((parrafo, indice) => (
        <p key={parrafo.slice(0, 40) + indice} className={indice === 0 ? undefined : "mt-3"}>
          {enfatizar(parrafo)}
        </p>
      ))}
    </>
  );
}
