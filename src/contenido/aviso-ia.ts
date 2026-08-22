/**
 * Texto del aviso de divulgación (HU-02, RF-11).
 *
 * Vive acá como datos y no dentro del componente por la misma razón por la que
 * el prompt de sistema vive en `recursos/prompts/` del backend: es contenido que
 * se revisa por separado del código, y su redacción es materia de cumplimiento
 * —Anthropic y OpenAI exigen la divulgación por contrato, no como recomendación—.
 * Cambiarlo tiene que verse como un cambio de contenido en el historial, no
 * perdido entre JSX.
 */

/** Cómo llegar a orientación profesional humana. */
export interface CanalDeAyuda {
  nombre: string;
  detalle: string;
  /** Enlace, si el canal tiene uno. */
  href?: string;
}

export interface AvisoIA {
  /**
   * Versión de este texto. Es lo que se registra como consentido (HU-03a).
   *
   * Se versiona porque el registro tiene que decir **qué** aceptó cada
   * persona, no sólo que aceptó algo: un `true` suelto no prueba nada si el
   * aviso cambió después. Al subirla, quien ya había aceptado vuelve a ver
   * la puerta, que es justamente el punto.
   */
  version: string;
  titulo: string;
  parrafos: readonly string[];
  tituloAyuda: string;
  canales: readonly CanalDeAyuda[];
  /** Texto del botón que confirma la lectura. */
  aceptar: string;
  /** Texto del control que vuelve a abrir el aviso una vez aceptado. */
  reabrir: string;
}

/**
 * Redacción dirigida a personas de 17 y 18 años: segunda persona con voseo,
 * frases cortas, sin lenguaje jurídico. Es el mismo registro que fija RNF-01
 * para la conversación; un aviso escrito como un contrato lo rompería en la
 * primera pantalla.
 */
export const AVISO: AvisoIA = {
  version: "aviso-v1",

  titulo: "Antes de empezar, algo importante",

  parrafos: [
    "VocaIA es un sistema de inteligencia artificial. No hay una persona del otro lado leyendo lo que escribís.",
    "Sirve para ayudarte a ordenar lo que pensás sobre qué estudiar. No decide por vos y no te va a decir qué carrera seguir.",
    "No reemplaza a un orientador vocacional. Hablar con un profesional puede darte algo que esto no: si podés, hacelo.",
    "Puede equivocarse. Si algo de lo que te dice sobre una carrera te parece raro, verificalo antes de decidir.",
  ],

  tituloAyuda: "Dónde hablar con una persona",

  // PENDIENTE (G-02): los contactos reales de orientación —gabinete
  // psicopedagógico y consejeros estudiantiles por carrera— son una gestión
  // institucional sin cerrar, responsable FQ. Hasta que estén, este arreglo
  // queda vacío y la sección no se renderiza: es preferible no mostrarla a
  // mostrar un contacto inventado, que es justamente lo que alguien en
  // problemas intentaría usar.
  canales: [],

  aceptar: "Entendido, empecemos",
  reabrir: "Qué es VocaIA",
};
