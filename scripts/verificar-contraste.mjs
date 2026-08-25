/**
 * Verifica que la paleta cumpla WCAG 2.1 AA.
 *
 * Lee los tokens de `src/styles.css` y calcula el contraste de los pares que
 * de verdad se usan. Falla con código distinto de cero si alguno no llega, así
 * que puede correr en CI.
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
  // 1.4.11: el borde de un campo es información necesaria para identificarlo.
  ["Borde de campos sobre el fondo", "input", "background", 3.0],
  // El anillo de foco tiene que verse, o la navegación por teclado se pierde.
  ["Anillo de foco sobre el fondo", "ring", "background", 3.0],
];

function leerTokens() {
  const css = readFileSync(join(RAIZ, "src", "styles.css"), "utf8");
  const tokens = new Map();
  const patron = /--color-([a-z-]+):\s*oklch\(([^)]+)\)/g;
  for (const [, nombre, valores] of css.matchAll(patron)) {
    const [l, c, h] = valores.trim().split(/\s+/).map(Number);
    tokens.set(nombre, [l, c ?? 0, h ?? 0]);
  }
  return tokens;
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

const tokens = leerTokens();
let fallas = 0;
let faltantes = 0;

console.log("Contraste de la paleta — WCAG 2.1 AA\n");

for (const [descripcion, frente, fondo, minimo] of PARES) {
  const a = tokens.get(frente);
  const b = tokens.get(fondo);

  if (!a || !b) {
    console.log(`  ?  ${descripcion.padEnd(36)} falta el token ${a ? fondo : frente}`);
    faltantes++;
    continue;
  }

  const ratio = contraste(a, b);
  const pasa = ratio >= minimo;
  if (!pasa) fallas++;

  const marca = pasa ? "OK " : "MAL";
  console.log(
    `  ${marca} ${descripcion.padEnd(36)} ${ratio.toFixed(2).padStart(6)}:1  (mínimo ${minimo})`,
  );
}

console.log();

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
