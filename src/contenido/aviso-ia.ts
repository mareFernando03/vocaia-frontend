/**
 * Texto del aviso de divulgación (HU-02, RF-11) y del tratamiento de datos
 * que la persona consiente al aceptarlo (HU-03a).
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
  /**
   * Qué pasa con lo que la persona cuenta (HU-03a, VOCAIA-102).
   *
   * Va en el mismo diálogo y se acepta con el mismo botón: aceptar el aviso
   * es dar el consentimiento informado, y el art. 6 de la Ley 25.326 pide que
   * la persona sepa qué consiente antes de hacerlo, no después.
   */
  tituloDatos: string;
  datos: readonly string[];
  tituloAyuda: string;
  /** Quién atiende en los canales de abajo. Se omite si no hay canales. */
  presentacionAyuda: string;
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
  // v2 (VOCAIA-102): agrega qué pasa con los datos y los contactos de la
  // Facultad. Los cuatro párrafos de v1 quedan idénticos.
  version: "aviso-v2",

  titulo: "Antes de empezar, algo importante",

  parrafos: [
    "VocaIA es un sistema de inteligencia artificial. No hay una persona del otro lado leyendo lo que escribís.",
    "Sirve para ayudarte a ordenar lo que pensás sobre qué estudiar. No decide por vos y no te va a decir qué carrera seguir.",
    "No reemplaza a un orientador vocacional. Hablar con un profesional puede darte algo que esto no: si podés, hacelo.",
    "Puede equivocarse. Si algo de lo que te dice sobre una carrera te parece raro, verificalo antes de decidir.",
  ],

  // No dice cuánto tiempo se guarda ni cómo pedir el borrado: eso llega con
  // HU-04 (Sprint 6), y prometerlo antes sería prometer algo que el sistema no
  // hace. El destinatario se nombra en genérico, decidido el 03/10.
  tituloDatos: "Qué pasa con lo que contás",
  datos: [
    "Lo que escribís se guarda, para que puedas retomar la charla y para armar tu perfil y tu informe.",
    "Para responderte y para armar tu perfil, lo que escribís se procesa con un proveedor externo de inteligencia artificial.",
    "Tu nombre y tu correo de Google se guardan aparte de la conversación. El nombre es para hablarte por él; el correo, para avisarte algo importante sobre tus datos.",
    "Lo usa el equipo que desarrolla VocaIA, en el Proyecto Final de la UTN Facultad Regional San Francisco, solo para este proyecto. Aparte del proveedor de IA, no se le pasa a nadie más.",
    "Qué contar lo elegís vos.",
  ],

  tituloAyuda: "Dónde hablar con una persona",

  // G-02: la Secretaría de Coordinación y Políticas Universitarias contestó
  // el 24/09 que las consultas de aspirantes van a ella, que asesora o deriva
  // a cada especialidad. Es un área y no una persona. Los datos son los de
  // `recursos/corpus/contacto-derivacion-v1.yaml` del backend, que también
  // muestra el informe: si cambian allá, cambian acá, y con eso la versión.
  presentacionAyuda:
    "La Secretaría de Coordinación y Políticas Universitarias de la Facultad atiende a quienes quieren estudiar acá, y te puede asesorar o poner en contacto con quien corresponda.",
  canales: [
    {
      nombre: "Correo",
      detalle: "scpu@fr.sanfrancisco.utn.edu.ar",
      href: "mailto:scpu@fr.sanfrancisco.utn.edu.ar",
    },
    { nombre: "Teléfono", detalle: "(03564) 421147, interno 116", href: "tel:+543564421147,116" },
    { nombre: "WhatsApp", detalle: "3564 236255", href: "https://wa.me/5493564236255" },
  ],

  aceptar: "Entendido, empecemos",
  reabrir: "Qué es VocaIA",
};
