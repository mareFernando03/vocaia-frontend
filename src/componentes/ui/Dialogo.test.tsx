import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { BotonIcono } from "./BotonIcono";
import { Dialogo } from "./Dialogo";

function Ejemplo() {
  const [abierto, cambiar] = useState(false);
  return (
    <Dialogo
      titulo="Fuentes"
      abierto={abierto}
      alCambiar={cambiar}
      disparador={<BotonIcono etiqueta="Ver fuentes">?</BotonIcono>}
    >
      <a href="#fuente">Fuente institucional</a>
    </Dialogo>
  );
}

describe("Dialogo", () => {
  it.each(["Escape", "botón"])(
    "contiene el foco y lo devuelve al disparador al cerrar con %s",
    async (cierre) => {
      const usuario = userEvent.setup();
      render(<Ejemplo />);
      const disparador = screen.getByRole("button", { name: "Ver fuentes" });
      await usuario.tab();
      expect(disparador).toHaveFocus();
      await usuario.keyboard("{Enter}");
      const cerrar = screen.getByRole("button", { name: "Cerrar" });
      await waitFor(() => expect(cerrar).toHaveFocus());
      await usuario.tab();
      expect(screen.getByRole("link", { name: "Fuente institucional" })).toHaveFocus();
      await usuario.tab();
      expect(cerrar).toHaveFocus();
      if (cierre === "Escape") await usuario.keyboard("{Escape}");
      else await usuario.click(cerrar);
      await waitFor(() => expect(disparador).toHaveFocus());
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    },
  );
});
