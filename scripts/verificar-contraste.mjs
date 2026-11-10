/**
 * Verifica que la paleta cumpla WCAG 2.2 AA, en el tema claro y en el oscuro.
 *
 * Lee los tokens de `src/styles.css` y calcula el contraste de los pares que
 * de verdad se usan. Falla con código distinto de cero si alguno no llega, así
 * que puede correr en CI.
 *
 * El tema oscuro sale de lo que está entre `tema-oscuro:inicio` y
 * `tema-oscuro:fin`; lo que no se redefine ahí hereda el valor del claro, igual
 * que en el navegador. Los dos temas se miden con los mismos pares: un par que
 * sólo cumple en uno de los dos falla para la mitad de las personas.
 *
 * Existe porque «respeta el contraste mínimo de accesibilidad» es criterio de
 * aceptación de HU-08, y un criterio que no se puede ejecutar es una promesa.
 * Con esto, cambiar un color y romper accesibilidad deja de ser algo que se
 * descubre en la defensa.
 *
 *   node scripts/verificar-contraste.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Pares que se usan en la interfaz, con el mínimo que les exige WCAG. */
const PARES = [
  ["Texto normal sobre el fondo", "foreground", "background", 4.5],
  ["Texto normal sobre tarjeta", "foreground", "surface", 4.5],
  ["Texto secundario sobre el fondo", "muted-foreground", "background", 4.5],
  ["Texto del botón primario", "primary-foreground", "primary", 4.5],
  ["Texto del botón primario claro", "primary-foreground", "primary-light", 4.5],
  ["Texto sobre el acento", "accent-foreground", "accent", 4.5],
  ["Texto sobre error", "destructive-foreground", "destructive", 4.5],
  ["Texto sobre éxito", "success-foreground", "success", 4.5],
  ["Texto sobre advertencia", "warning-foreground", "warning", 4.5],
  ["Enlaces sobre el fondo", "primary", "background", 4.5],
  // El bloque de fuentes consultadas de la conversación va sobre `surface`, y
  // sus enlaces son lo único que se puede seguir para verificar una cita.
  ["Enlaces sobre tarjeta", "primary", "surface", 4.5],
  // En ese mismo bloque va la salvedad de que el corpus es provisional. Es
  // texto secundario sobre tarjeta, un par que hasta acá nadie había medido.
  ["Texto secundario sobre tarjeta", "muted-foreground", "surface", 4.5],
  // Fondo de la sección de ayuda del aviso y del hover de los botones neutros.
  ["Texto normal sobre el azul claro", "foreground", "primary-soft", 4.5],
  // La salvedad del perfil todavía no publicable va sobre el ámbar suave. Es
  // lo que evita que alguien lea un bosquejo como una recomendación, así que
  // tiene que ser legible: es de las cosas que no se pueden pasar por alto.
  ["Texto de la salvedad sobre el ámbar suave", "accent-foreground", "accent-soft", 4.5],
  // 1.4.11: el borde de un campo es información necesaria para identificarlo.
  ["Borde de campos sobre el fondo", "input", "background", 3.0],
  // El anillo de foco tiene que verse, o la navegación por teclado se pierde.
  ["Anillo de foco sobre el fondo", "ring", "background", 3.0],
  // Los enlaces de contacto del aviso reciben el foco sobre el azul claro.
  ["Anillo de foco sobre el azul claro", "ring", "primary-soft", 3.0],
  // El aviso a la Facultad del perfil es una tarjeta con sus propios botones y
  // su propio mensaje de error.
  ["Texto de error sobre tarjeta", "destructive", "surface", 4.5],
  ["Anillo de foco sobre tarjeta", "ring", "surface", 3.0],
  // Los errores de cada pantalla van sobre el fondo, no sobre una tarjeta.
  ["Texto de error sobre el fondo", "destructive", "background", 4.5],
  ["Botón peligro-fantasma al pasar el mouse", "destructive", "destructive-soft", 4.5],
  // El 911 y los enlaces de la salvedad reciben el foco sobre el ámbar suave.
  ["Anillo de foco sobre el ámbar suave", "ring", "accent-soft", 3.0],
  // La fecha del historial y la pestaña activa van sobre el azul claro.
  ["Texto secundario sobre el azul claro", "muted-foreground", "primary-soft", 4.5],
  ["Enlace sobre el azul claro", "primary", "primary-soft", 4.5],
  // El aviso de apoyo cuando la charla se corta, y su botón para llamar al 911.
  ["Texto sobre el aviso de apoyo", "foreground", "support-soft", 4.5],
  ["Botón del aviso de apoyo", "support-foreground", "support", 4.5],
  ["Ícono del aviso de apoyo", "support", "support-soft", 3.0],
  ["Anillo de foco sobre el aviso de apoyo", "ring", "support-soft", 3.0],
  // Toggletips, menús y ventanas flotan sobre `surface-raised`.
  ["Texto sobre lo que flota", "foreground", "surface-raised", 4.5],
  ["Texto secundario sobre lo que flota", "muted-foreground", "surface-raised", 4.5],
  ["Enlaces sobre lo que flota", "primary", "surface-raised", 4.5],
  ["Anillo de foco sobre lo que flota", "ring", "surface-raised", 3.0],
  // El campo de la conversación y el buscador quedan sobre tarjeta en algunas
  // pantallas: el borde tiene que distinguirse también ahí.
  ["Borde de campos sobre tarjeta", "input", "surface", 3.0],
  // La insignia «Verificado» de los habilitantes del informe.
  ["Texto de éxito sobre tarjeta", "success", "surface", 4.5],
];

function leerColores(css) {
  const tokens = new Map();
  const patron = /--color-([a-z-]+):\s*oklch\(([^)]+)\)/g;
  for (const [, nombre, valores] of css.matchAll(patron)) {
    const [l, c, h] = valores.trim().split(/\s+/).map(Number);
    tokens.set(nombre, [l, c ?? 0, h ?? 0]);
  }
  return tokens;
}

function leerTemas() {
  const css = readFileSync(join(RAIZ, "src", "styles.css"), "utf8");
  const inicio = css.indexOf("tema-oscuro:inicio");
  const fin = css.indexOf("tema-oscuro:fin");
  if (inicio === -1 || fin === -1) {
    console.error("No encuentro las marcas del tema oscuro en styles.css.");
    process.exit(1);
  }
  const bloqueTema = css.slice(css.indexOf("@theme"), css.indexOf("@media screen"));
  const claro = leerColores(bloqueTema);
  const oscuro = new Map([...claro, ...leerColores(css.slice(inicio, fin))]);
  return [
    ["claro", claro],
    ["oscuro", oscuro],
  ];
}

/** OKLCH → sRGB lineal. */
function aLineal([L, C, H]) {
  const rad = (H * Math.PI) / 180;
  const a = C * Math.cos(rad);
  const b = C * Math.sin(rad);

  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => Math.min(1, Math.max(0, v)));
}

function luminancia(color) {
  const [r, g, b] = aLineal(color);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(c1, c2) {
  const l1 = luminancia(c1);
  const l2 = luminancia(c2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

let fallas = 0;
let faltantes = 0;

for (const [tema, tokens] of leerTemas()) {
  console.log(`Contraste de la paleta, tema ${tema} — WCAG 2.2 AA
`);

  for (const [descripcion, frente, fondo, minimo] of PARES) {
    const a = tokens.get(frente);
    const b = tokens.get(fondo);

    if (!a || !b) {
      console.log(`  ?  ${descripcion.padEnd(40)} falta el token ${a ? fondo : frente}`);
      faltantes++;
      continue;
    }

    const ratio = contraste(a, b);
    const pasa = ratio >= minimo;
    if (!pasa) fallas++;

    const marca = pasa ? "OK " : "MAL";
    console.log(
      `  ${marca} ${descripcion.padEnd(40)} ${ratio.toFixed(2).padStart(6)}:1  (mínimo ${minimo})`,
    );
  }

  console.log();
}

if (faltantes > 0) {
  console.error(`Faltan ${faltantes} token(s) declarados en la verificación.`);
}
if (fallas > 0) {
  console.error(
    `${fallas} par(es) no alcanzan el mínimo. Oscurecé el color de fondo o aclará el de\n` +
      `texto ajustando el primer número del oklch(), que es la luminosidad: cambia el\n` +
      `contraste sin cambiar el tono.`,
  );
}
if (fallas > 0 || faltantes > 0) process.exit(1);

console.log("Todos los pares cumplen.");
