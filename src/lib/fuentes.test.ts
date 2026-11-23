import { describe, expect, it } from "vitest";

import { citadas, documentoDe, sinContenidas, unaPorDocumento } from "./fuentes";

describe("fuentes sin repetir (recorrido del 22/11)", () => {
  const pagina = (n: number) =>
    `Ordenanza C.S. N.º 1877, pág. ${n} — https://e.org/1877.pdf#page=${n}`;

  it("una ordenanza es un documento, cualquiera sea la página", () => {
    expect(documentoDe(pagina(54))).toBe(documentoDe(pagina(40)));
    expect(unaPorDocumento([{ fuente: pagina(54) }, { fuente: pagina(40) }])).toHaveLength(1);
  });

  it("sólo las que la respuesta cita con su número", () => {
    expect(citadas(["a", "b", "c"], "Dura cinco años [1] y se cursa de noche [3].")).toEqual([
      "a",
      "c",
    ]);
  });

  it("una frase contenida en otra del mismo mensaje no va aparte", () => {
    const cita = (fragmento: string) => ({ fragmento, sesion_id: "s", turno: 7 });
    const entera = cita("en mi casa quieren que haga sistemas porque dicen que tiene salida");
    const parte = cita("porque dicen que tiene salida");
    expect(sinContenidas([entera, parte])).toEqual([entera]);
  });
});
