/**
 * Los textos de la descarga de los datos (HU-04, S6-02).
 *
 * Dicen lo que ADR-014 §3 pide que la pantalla avise antes de descargar: que el
 * archivo tiene todo, también lo sensible, y que conviene guardarlo con
 * cuidado. No explican el formato más que en una línea: quien lo quiera leer
 * lo abre, y quien lo quiera llevar a otro lado necesita saber que es JSON.
 */
export const DESCARGA = {
  titulo: "Descargar lo que VocaIA guarda de vos",
  explicacion:
    "Es un archivo con tu cuenta, cada conversación tal como la escribiste, lo que VocaIA leyó de cada una, tus informes y tu perfil. Está en formato JSON, que se abre con cualquier editor de texto y lo puede leer otro programa.",
  cuidado:
    "Puede tener cosas delicadas que contaste, como momentos en que la pasaste mal. Guardalo en un lugar donde no lo vea otra persona.",
  boton: "Descargar mis datos",
  descargando: "Preparando el archivo…",
  /** Lo que se anuncia cuando el archivo ya bajó. */
  listo: (nombre: string) => `Listo: se descargó ${nombre}.`,
} as const;
