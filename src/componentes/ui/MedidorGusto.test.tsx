import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { comoTeCae, nivelDeGusto } from "../../contenido/como-te-cae";
import { MedidorGusto } from "./MedidorGusto";

describe("MedidorGusto", () => {
  it("la frase y los escalones salen de los mismos umbrales", () => {
    for (const intensidad of [-2, -1, -0.5, 0, 0.3, 1, 2]) {
      const { container, unmount } = render(<MedidorGusto intensidad={intensidad} />);
      expect(screen.getByText(comoTeCae(intensidad))).toBeInTheDocument();
      const llenos = container.querySelectorAll(".bg-primary").length;
      expect(llenos).toBe(nivelDeGusto(intensidad) + 1);
      unmount();
    }
  });

  it("no muestra un número", () => {
    render(<MedidorGusto intensidad={1.4} />);
    expect(screen.queryByText(/1[.,]4/)).not.toBeInTheDocument();
  });
});
