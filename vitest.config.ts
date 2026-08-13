import { defineConfig, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config";

/**
 * Config de pruebas aparte de la de build: comparte plugins y alias con Vite,
 * pero que `vite.config.ts` no cargue nada de test mantiene el build limpio.
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
