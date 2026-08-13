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
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/**/*.test.{ts,tsx}", "src/pruebas/**", "src/main.tsx"],
      },
    },
  }),
);
