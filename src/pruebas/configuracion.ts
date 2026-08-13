/**
 * Preparación del entorno de pruebas.
 *
 * Vive dentro de `src/` y no en la raíz para que `tsconfig.json` lo incluya en
 * el programa: es lo que hace que los matchers de jest-dom estén tipados en los
 * archivos de prueba.
 */

import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
  // El aviso se acepta por sesión: sin limpiar, la primera prueba que acepta
  // deja aceptadas a todas las que siguen y la puerta deja de probarse.
  window.sessionStorage.clear();
});
