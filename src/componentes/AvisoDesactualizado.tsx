import { Check, Copy, Flag } from "lucide-react";
import { useEffect, useState } from "react";

import { CONTACTO, correoDatoDesactualizado } from "../contenido/contacto";
import { BotonIcono } from "./ui/BotonIcono";

/**
 * «¿Este dato está desactualizado? Avisanos», al pie de cada carrera.
 *
 * El enlace abre un correo ya escrito con el nombre de la carrera, así que no
 * hace falta backend ni que la persona explique de qué ficha habla. Pero un
 * `mailto:` no hace nada en un teléfono sin aplicación de correo, así que la
 * dirección también está a la vista, con un botón para copiarla.
 */
export function AvisoDesactualizado({ carrera }: { carrera: string }) {
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const reloj = setTimeout(() => setCopiado(false), 2000);
    return () => clearTimeout(reloj);
  }, [copiado]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(CONTACTO.correo);
      setCopiado(true);
    } catch {
      // Sin permiso para el portapapeles la dirección sigue a la vista y se
      // puede seleccionar a mano: no hay nada que avisar.
    }
  }

  return (
    <div className="border-border text-muted-foreground flex flex-col border-t pt-1 text-sm print:hidden">
      <p className="flex flex-wrap items-center gap-x-1.5">
        <Flag aria-hidden="true" className="size-4 shrink-0" />
        <span>¿Este dato está desactualizado?</span>
        <a
          href={correoDatoDesactualizado(carrera)}
          className="text-primary inline-flex min-h-11 items-center font-medium underline underline-offset-4"
        >
          Avisanos
        </a>
      </p>
      <p className="-mt-2 flex items-center ps-5.5">
        <span className="select-all">{CONTACTO.correo}</span>
        <BotonIcono
          etiqueta={copiado ? "Dirección copiada" : "Copiar la dirección de correo"}
          onClick={() => void copiar()}
          className="[&_svg]:size-4"
        >
          {copiado ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        </BotonIcono>
        {/* La confirmación se anuncia: el cambio de ícono no lo ve un lector. */}
        <span role="status" className="sr-only">
          {copiado ? "Dirección copiada" : ""}
        </span>
      </p>
    </div>
  );
}
