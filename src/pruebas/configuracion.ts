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

// jsdom no implementa `scrollIntoView`: no tiene disposición visual, así que no
// hay a dónde desplazarse. Sin este relleno, cualquier componente que siga una
// lista que crece —la conversación— falla en las pruebas por algo que en el
// navegador funciona.
Element.prototype.scrollIntoView = () => {};

afterEach(() => {
  cleanup();
  // El aviso se acepta por sesión: sin limpiar, la primera prueba que acepta
  // deja aceptadas a todas las que siguen y la puerta deja de probarse.
  window.sessionStorage.clear();
});
