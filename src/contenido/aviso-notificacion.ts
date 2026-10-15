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
  // Tiene que coincidir con `VERSIONES_NOTIFICACION` del backend, que solo
  // avisa con un consentimiento sobre una de esas versiones. Cambiar el texto
  // es cambiar la versión: la prueba de la huella lo hace fallar si no.
  //
  // ponytail: la pantalla muestra `vigente`, que no mira la versión. Al subir a
  // v2, quien otorgó la v1 tiene que verse como no autorizado.
  version: "notificacion-v1",

  titulo: "Avisar a la Facultad si necesitás ayuda",

  // Nombra los dos casos porque el backend avisa los dos: lo emocional y lo
  // académico, incluso pensar en cambiarse de carrera. Dice cuándo se avisa,
  // no qué viaja: eso está en «Qué se avisa».
  presentacion:
    "Si en la charla aparece algo que muestre que la estás pasando mal, o que estás pensando en dejar o cambiar la carrera, VocaIA puede avisarle a la Facultad. Solo lo hace si lo autorizás.",

  // Dice lo mismo que el correo que arma el backend (`componer_aviso`, #78):
  // que hay una señal, su nivel y el contacto. No dice de qué fue, porque el
  // backend no lo manda: atado a un nombre sería un dato de salud. El nombre y
  // el correo se nombran con su finalidad (Ley 25.326, art. 6) porque el aviso
  // de IA promete que no se le pasan a nadie, y este consentimiento es la
  // excepción. No se promete que alguien vaya a escribir.
  //
  // El destino no está acordado (S5-11): hoy el aviso va a una casilla de
  // prueba. Cuando se acuerde, nombrarlo cambia el texto y por lo tanto la
  // versión, y quien otorgó la v1 tiene que volver a aceptar.
  detalles: [
    {
      titulo: "Qué se avisa",
      texto:
        "Que apareció algo así y qué tan serio parece, sin decir de qué se trató. Va con tu nombre y tu correo, para que puedan comunicarse con vos.",
    },
    {
      titulo: "A quién",
      texto:
        "A la Facultad. Todavía se está acordando qué área lo recibe, y hasta que esté acordado el aviso no le llega a nadie.",
    },
    { titulo: "Qué no se comparte", texto: "Ni tu conversación ni tu perfil vocacional." },
  ],

  opcional:
    "Es opcional. Si no lo autorizás, seguís usando VocaIA igual, y podés cambiarlo cuando quieras.",

  noAutorizado: "Hoy no está autorizado.",
  autorizado: "Lo autorizaste el",
  otorgar: "Autorizar el aviso",
  revocar: "Dejar de autorizarlo",
} as const;
