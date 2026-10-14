/**
 * Texto del consentimiento para avisar a la Facultad ante una señal de riesgo
 * (HU-03b, HU-21).
 *
 * Vive acá y no en el componente por lo mismo que `aviso-ia.ts`: es contenido
 * de cumplimiento que se revisa aparte del código, y lo que se registra como
 * otorgado es la versión de **este** texto.
 *
 * Es independiente del aviso de tratamiento: haberlo aceptado no da este por
 * otorgado, y no otorgar este no cierra nada. Por eso el texto lo dice.
 */

export const NOTIFICACION = {
  // ponytail: el backend guarda la versión, pero la pantalla no la compara
  // todavía. Al subirla a v2, mostrar como no autorizado a quien otorgó la v1.
  version: "notificacion-v1",

  titulo: "Avisar a la Facultad si necesitás ayuda",

  // El área se nombra en genérico: la Secretaría todavía no confirmó quién lo
  // recibe, y nombrar a alguien sería prometer algo que no está acordado.
  presentacion:
    "Si en la charla aparece algo que haga pensar que podés estar en riesgo, VocaIA puede avisarle a la Facultad. Solo lo hace si lo autorizás.",

  detalles: [
    {
      titulo: "Qué se avisa",
      texto: "Que apareció una señal de riesgo, de dónde surgió y qué tan seria parece.",
    },
    { titulo: "A quién", texto: "Al área de la Facultad que coordina la orientación vocacional." },
    { titulo: "Qué no se comparte", texto: "Ni tu conversación ni tu perfil vocacional." },
  ],

  opcional:
    "Es opcional. Si no lo autorizás, seguís usando VocaIA igual, y podés cambiarlo cuando quieras.",

  noAutorizado: "Hoy no está autorizado.",
  autorizado: "Lo autorizaste el",
  otorgar: "Autorizar el aviso",
  revocar: "Dejar de autorizarlo",
} as const;
