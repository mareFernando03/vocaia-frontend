/**
 * La pregunta que contestaba una respuesta corta.
 *
 * Las citas cortas —«Armar», «Con los de matemática»— no se entienden sin la
 * pregunta que contestaban (segundo recorrido local). Se busca en el historial
 * de su sesión: es la última pregunta del turno del agente anterior a la cita.
 * La cita se sigue mostrando literal; la pregunta va aparte, rotulada, para no
 * hacerla pasar por algo que la persona escribió.
 *
 * La usan el perfil y el informe, para que se lean igual (VOCAIA-220).
 */

import { useEffect, useRef, useState } from "react";

import { obtenerHistorial, type Historial } from "../api/conversacion";

/** Dónde está una cita: lo que comparten la evidencia del perfil y la del informe. */
export interface CitaUbicada {
  id: string;
  sesionId: string;
  turno: number;
  texto: string;
}

export function esCorta(texto: string): boolean {
  return texto.trim().split(/\s+/).length <= 4;
}

/**
 * Las preguntas de las citas cortas, por identificador de cita. Vacío hasta que
 * llegan, y mientras `activo` sea falso no se pide nada.
 */
export function usePreguntas(citas: CitaUbicada[], activo: boolean): Map<string, string> {
  const [preguntas, setPreguntas] = useState<Map<string, string>>(new Map());
  // Las citas llegan como un arreglo nuevo en cada dibujo: el efecto depende de
  // cuáles son, no de la identidad del arreglo, o pediría el historial en bucle.
  const cortas = citas.filter((cita) => esCorta(cita.texto));
  const clave = cortas.map((cita) => cita.id).join(",");
  const ultimas = useRef(cortas);
  ultimas.current = cortas;

  useEffect(() => {
    if (!activo || clave === "") return;
    let vigente = true;
    void preguntasDe(ultimas.current).then((encontradas) => vigente && setPreguntas(encontradas));
    return () => {
      vigente = false;
    };
  }, [activo, clave]);

  return preguntas;
}

async function preguntasDe(citas: CitaUbicada[]): Promise<Map<string, string>> {
  const encontradas = new Map<string, string>();
  // Un pedido por sesión en cada búsqueda, aunque varias citas sean de la misma
  // charla. No se guarda entre búsquedas: un historial pedido mientras la
  // persona chateaba no tiene los turnos que vinieron después.
  const historiales = new Map<string, Promise<Historial | null>>();
  for (const cita of citas) {
    if (!historiales.has(cita.sesionId)) {
      historiales.set(
        cita.sesionId,
        // Sin el historial la cita se muestra igual, sin su pregunta.
        Promise.resolve()
          .then(() => obtenerHistorial(cita.sesionId))
          .catch(() => null),
      );
    }
    const historial = await historiales.get(cita.sesionId);
    const anterior = historial?.turnos.find(
      (turno) => turno.numero === cita.turno - 1 && turno.rol === "agente",
    );
    const pregunta = anterior && ultimaPregunta(anterior.contenido);
    if (pregunta) encontradas.set(cita.id, pregunta);
  }
  return encontradas;
}

function ultimaPregunta(texto: string): string | null {
  const preguntas = texto.match(/[^.!?\n]*\?/g);
  return preguntas ? preguntas[preguntas.length - 1].trim() : null;
}
