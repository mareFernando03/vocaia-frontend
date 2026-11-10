import { useEffect } from "react";

/**
 * Marca `<html data-teclado>` mientras el teclado del teléfono está abierto.
 *
 * Con el teclado abierto, la barra de pestañas de abajo se esconde y el campo
 * de la conversación baja a ocupar su lugar: si no, entre el teclado, la barra y
 * el campo no queda pantalla para leer la charla.
 *
 * No alcanza con mirar si un campo tiene el foco. La conversación enfoca su
 * campo apenas carga, para quien usa teclado físico; en un teléfono ese foco no
 * abre el teclado, y esconder la barra por eso dejaba a la persona sin forma de
 * salir de la charla. Lo que sí delata al teclado es que la parte visible de la
 * página se achica de golpe: se compara con la altura más grande que se vio.
 */
export function useTecladoVirtual() {
  useEffect(() => {
    const visible = window.visualViewport;
    if (!visible) return;
    const raiz = document.documentElement;
    let alturaMaxima = visible.height;

    const medir = () => {
      alturaMaxima = Math.max(alturaMaxima, visible.height);
      // Un teclado se lleva bastante más que la barra de direcciones del
      // navegador, que también cambia la altura al desplazarse.
      const abierto = visible.height < alturaMaxima * 0.75;
      if (abierto) raiz.dataset.teclado = "";
      else delete raiz.dataset.teclado;
    };
    // Al girar el teléfono la altura de referencia es otra.
    const reiniciar = () => {
      alturaMaxima = visible.height;
      medir();
    };

    visible.addEventListener("resize", medir);
    window.addEventListener("orientationchange", reiniciar);
    return () => {
      visible.removeEventListener("resize", medir);
      window.removeEventListener("orientationchange", reiniciar);
      delete raiz.dataset.teclado;
    };
  }, []);
}
