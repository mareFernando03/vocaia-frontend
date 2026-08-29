import { defineConfig, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config";

/**
 * Config de pruebas aparte de la de build: hereda los plugins de Vite, pero que
 * `vite.config.ts` no cargue nada de test mantiene el build limpio.
 *
 * No hereda alias de módulos porque no hay ninguno configurado. Ojo con esto:
 * `tsconfig.json` declara el path `@/*`, así que un import con `@/` typecheckea
 * bien y después falla al resolver, tanto acá como en `vite build`. Hasta que
 * se agregue el alias a `vite.config.ts` —o se saque del tsconfig—, los imports
 * van relativos.
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["./src/pruebas/configuracion.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      coverage: {
        provider: "v8",
        // `text` deja el número en el log; `json-summary` lo escribe en
        // `coverage/coverage-summary.json`, que es lo que el workflow lee para
        // publicarlo en el resumen del check sin tener que abrir el log.
        // Todavía sin umbral: primero se mira el número (VOCAIA-87).
        reporter: ["text", "json-summary", "html"],
        include: ["src/**/*.{ts,tsx}"],
        // A lo de siempre se suman dos cosas que no son código nuestro y que
        // v8 cuenta como 0%: las declaraciones `.d.ts`, que no tienen nada
        // ejecutable, y el cliente que `generar-cliente` deriva de
        // `openapi.json`. Dejarlas adentro hunde el total sin decir nada sobre
        // lo que falta probar, justo cuando el número se va a usar para elegir
        // un umbral.
        exclude: [
          "src/**/*.test.{ts,tsx}",
          "src/pruebas/**",
          "src/main.tsx",
          "src/**/*.d.ts",
          "src/api/generado/**",
        ],
      },
    },
  }),
);
