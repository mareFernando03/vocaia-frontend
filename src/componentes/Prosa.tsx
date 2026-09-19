/**
 * El texto que escribe el agente, que viene en markdown (VOCAIA-132).
 *
 * El encuadre de apertura vive en el backend como `recursos/prompts/encuadre-v1.md`
 * y llega con `**negrita**` y con los renglones cortados a mano, que es como se
 * escribe un archivo para leerlo en el editor. Mostrado como texto preformateado
 * se lee con los asteriscos a la vista y cortado donde lo cortó el archivo, que
 * no es donde termina la pantalla de quien lee.
 *
 * Se interpreta un subconjunto mínimo y a propósito: párrafos, negrita y listas.
 * No hay enlaces ni HTML, así que no hay nada que sanear —React escapa todo lo
 * que no sean los nodos que arma esto— y cualquier otra marca que aparezca se
 * muestra tal cual en vez de desaparecer de la pantalla.
 *
 * **Las listas están acá porque el corte de renglón no siempre es del archivo.**
 * Adentro de un párrafo se junta, porque ahí el corte lo puso quien escribió el
 * archivo a 75 columnas. En una lista lo puso el que la escribió para que se
 * lean separados, y juntarlos convierte la devolución del cierre en un párrafo
 * corrido con guiones adentro. El prompt de sistema desalienta las listas pero
 * no las prohíbe, y en la corrida del 19/09 uno de los tres perfiles las usó.
 *
 * **Lo que escribe la persona no pasa por acá.** Su mensaje se muestra como lo
 * escribió: si puso asteriscos, quiso poner asteriscos.
 */

import type { ReactNode } from "react";

/** Un párrafo termina donde hay un renglón en blanco, como en markdown. */
const CORTE_DE_PARRAFO = /\n\s*\n/;

/** Un ítem de lista, con cualquiera de las tres marcas que usa el modelo. */
const ITEM_DE_LISTA = /^\s*[-*•]\s+(.+)$/;

const NEGRITA = /\*\*(.+?)\*\*/g;

type Bloque = { tipo: "parrafo"; texto: string } | { tipo: "lista"; items: string[] };

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

/**
 * Parte el texto en párrafos y listas.
 *
 * Un mismo bloque puede tener las dos cosas: el modelo abre con un renglón de
 * entrada —«De lo que me contaste, me quedó esto:»— y sigue con los ítems sin
 * dejar un renglón en blanco en el medio.
 */
function bloques(texto: string): Bloque[] {
  const resultado: Bloque[] = [];

  for (const crudo of texto.split(CORTE_DE_PARRAFO)) {
    let renglones: string[] = [];
    let items: string[] = [];

    const cerrarParrafo = () => {
      const junto = renglones.join(" ").trim();
      if (junto !== "") resultado.push({ tipo: "parrafo", texto: junto });
      renglones = [];
    };
    const cerrarLista = () => {
      if (items.length > 0) resultado.push({ tipo: "lista", items });
      items = [];
    };

    for (const renglon of crudo.split("\n")) {
      const item = ITEM_DE_LISTA.exec(renglon);
      if (item) {
        cerrarParrafo();
        items.push(item[1].trim());
      } else if (renglon.trim() !== "") {
        cerrarLista();
        renglones.push(renglon.trim());
      }
    }

    cerrarParrafo();
    cerrarLista();
  }

  return resultado;
}

export function Prosa({ texto }: { texto: string }) {
  return (
    <>
      {bloques(texto).map((bloque, indice) =>
        bloque.tipo === "lista" ? (
          <ul key={indice} className="mt-3 list-disc space-y-1 ps-5">
            {bloque.items.map((item, posicion) => (
              <li key={item.slice(0, 40) + posicion}>{enfatizar(item)}</li>
            ))}
          </ul>
        ) : (
          <p key={indice} className={indice === 0 ? undefined : "mt-3"}>
            {enfatizar(bloque.texto)}
          </p>
        ),
      )}
    </>
  );
}
