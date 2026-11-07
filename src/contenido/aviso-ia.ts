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
  /** El enlace a la política de privacidad, que dice lo mismo con más detalle. */
  politica: { texto: string; href: string };
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
  // v3 (VOCAIA-184): agrega la moderación como finalidad (P-13), porque desde
  // S5-01 cada mensaje va también al filtro de seguridad del proveedor, y lo que
  // el proveedor retiene de cada uso (V-09), y los cuatro agregados de ADR-014
  // §5: la descarga, la baja, cuánto se guarda y qué no alcanza el borrado.
  // Los párrafos de v1 quedan idénticos.
  // v4 (S7-15, VOCAIA-207): corrige las dos frases que la auditoría de privacidad
  // encontró no ciertas (A-6 y A-7). El correo no era «para avisarte algo
  // importante»: ningún código le escribe a la persona. Y «no se le pasa a nadie
  // más» callaba a los servicios donde funciona VocaIA. Suma el enlace a la
  // política (A-9). Lo demás queda idéntico.
  version: "aviso-v4",

  titulo: "Antes de empezar, algo importante",

  parrafos: [
    "VocaIA es un sistema de inteligencia artificial. No hay una persona del otro lado leyendo lo que escribís.",
    "Sirve para ayudarte a ordenar lo que pensás sobre qué estudiar. No decide por vos y no te va a decir qué carrera seguir.",
    "No reemplaza a un orientador vocacional. Hablar con un profesional puede darte algo que esto no: si podés, hacelo.",
    "Puede equivocarse. Si algo de lo que te dice sobre una carrera te parece raro, verificalo antes de decidir.",
  ],

  // El destinatario se nombra en genérico, decidido el 03/10. Por lo mismo no
  // dice para qué es el nombre: hoy ningún prompt ni endpoint lo lee, y la
  // finalidad se agrega cuando exista.
  tituloDatos: "Qué pasa con lo que contás",
  datos: [
    "Lo que escribís se guarda, para que puedas retomar la charla y para armar tu perfil y tu informe.",
    // ADR-014 §5, con la descarga (backend #104, frontend #46) y la baja
    // (backend #96, frontend #41) ya integradas: dice cuánto se guarda y qué
    // alcanza el borrado.
    "Desde tu perfil podés descargar lo que VocaIA guarda de vos, y borrar tu cuenta cuando quieras.",
    "Se guarda hasta que termine el proyecto, y después se borra.",
    "Si borrás tu cuenta, se borra en el momento, salvo esto: el correo con el que te anotaste a la prueba queda en la lista de inscripción hasta que termine el proyecto; en la copia de seguridad puede quedar hasta 7 días más; lo que el proveedor de IA guarda para controlar abusos se borra dentro de los 30 días; y si autorizaste el aviso a la Facultad y ya se mandó, queda allá y en el registro del servicio que lo envía.",
    "Si te das de baja después de que publiquemos un resultado del grupo, ese resultado no cambia. Nunca lleva tu nombre.",
    "Para responderte, para armar tu perfil y para revisar cada mensaje por seguridad, lo que escribís se procesa con un proveedor externo de inteligencia artificial.",
    // V-09: la moderación no se guarda, pero el mismo texto va también a la
    // conversación, que el proveedor guarda hasta 30 días. Para quien lee
    // importa lo segundo, así que el aviso no separa los dos usos.
    "Ese proveedor no usa lo que escribís para entrenar sus modelos, y lo puede guardar hasta 30 días para controlar abusos.",
    // A-7: los usos reales del nombre y el correo. La lista blanca lee el correo
    // al ingresar; el aviso a la Secretaría lleva los dos; la descarga los
    // incluye; y el análisis del piloto une por correo lo de la inscripción con
    // la conversación (analisis-piloto.md §2).
    "Tu nombre y tu correo de Google se guardan aparte de la conversación y no se mezclan con ella. El correo sirve para comprobar que te anotaste a la prueba y, al analizar los resultados, para unir lo que contestaste al anotarte con tu conversación. Los dos van en la descarga de tus datos, y en el aviso a la Facultad solo si lo autorizás.",
    // A-6: los destinatarios. Render y Neon están en Virginia (ADR-005). La
    // región de la página de inscripción no está verificada (F-3), así que no
    // se dice.
    "Todo esto lo usa el equipo que desarrolla VocaIA, en el Proyecto Final de la UTN Facultad Regional San Francisco, solo para este proyecto. Además del proveedor de IA, lo guardan por cuenta del equipo los servicios donde funciona VocaIA: el servidor y la base de datos, en Estados Unidos, y la página de inscripción a la prueba. Si autorizás el aviso a la Facultad, sale por un servicio de correo con servidores en la Unión Europea. A nadie más.",
    "Qué contar lo elegís vos.",
  ],

  tituloAyuda: "Dónde hablar con una persona",

  // G-02: la Secretaría de Coordinación y Políticas Universitarias contestó
  // el 24/09 que las consultas de aspirantes van a ella, que asesora o deriva
  // a cada especialidad. Es un área y no una persona. Los datos son los de
  // `recursos/corpus/contacto-derivacion-v1.yaml` del backend, que también
  // muestra el informe: si cambian allá, cambian acá, y con eso la versión.
  presentacionAyuda:
    "Si querés hablar con una persona sobre qué estudiar, la Secretaría de Coordinación y Políticas Universitarias de la Facultad atiende a quienes quieren estudiar acá, y te puede asesorar o poner en contacto con quien corresponda.",
  canales: [
    {
      nombre: "Correo",
      detalle: "scpu@fr.sanfrancisco.utn.edu.ar",
      href: "mailto:scpu@fr.sanfrancisco.utn.edu.ar",
    },
    { nombre: "Teléfono", detalle: "(03564) 421147, interno 116", href: "tel:+543564421147,116" },
    { nombre: "WhatsApp", detalle: "3564 236255", href: "https://wa.me/5493564236255" },
  ],

  politica: { texto: "Leé la política de privacidad completa", href: "/privacidad.html" },

  aceptar: "Entendido, empecemos",
  reabrir: "Qué es VocaIA",
};
