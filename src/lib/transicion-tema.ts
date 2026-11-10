/**
 * Cambia de tema con un fundido, en lugar de un salto de golpe.
 *
 * Donde el navegador tiene View Transitions, la página vieja se funde sobre la
 * nueva y el ícono del botón gira por su cuenta (ver `styles.css`). Donde no
 * las tiene, una marca en `<html>` hace que los colores pasen de un tema al
 * otro con una transición común, y se quita cuando terminó: dejarla puesta
 * haría que cualquier hover tarde lo mismo.
 *
 * Con «reducir movimiento» pedido en el sistema, el cambio es inmediato.
 *
 * `cambiar` tiene que dejar el DOM ya en el tema nuevo cuando vuelve, porque
 * la transición saca la foto del estado final apenas termina.
 */

const DURACION_MS = 300;

export function conTransicionDeTema(cambiar: () => void) {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    cambiar();
    return;
  }

  if (typeof document.startViewTransition === "function") {
    document.startViewTransition(cambiar);
    return;
  }

  const raiz = document.documentElement;
  raiz.dataset.cambiandoTema = "";
  cambiar();
  window.setTimeout(() => {
    delete raiz.dataset.cambiandoTema;
  }, DURACION_MS);
}
