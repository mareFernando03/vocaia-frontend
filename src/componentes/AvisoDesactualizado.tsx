import { Check, Copy, Flag, Mail } from "lucide-react";
import { useEffect, useState } from "react";

import { CONTACTO, correoDatoDesactualizado } from "../contenido/contacto";
import { Boton } from "./ui/Boton";
import { BotonIcono } from "./ui/BotonIcono";
import { clasesBoton } from "./ui/clases-boton";
import { Dialogo } from "./ui/Dialogo";

/**
 * Una acción corta al pie de cada carrera. El correo aparece al abrirla,
 * así el catálogo y el informe no repiten la misma dirección en cada ficha.
 *
 * El enlace abre un correo ya escrito con el nombre de la carrera, así que no
 * hace falta backend ni que la persona explique de qué ficha habla. Pero un
 * `mailto:` necesita una aplicación de correo, así que también se ofrece
 * copiar la dirección para usarla por otro medio.
 */
export function AvisoDesactualizado({ carrera }: { carrera: string }) {
  const [abierto, setAbierto] = useState(false);
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
    <div className="border-border mt-auto border-t pt-1 print:hidden">
      <Dialogo
        titulo="Avisar de un dato"
        abierto={abierto}
        alCambiar={(mostrar) => {
          setAbierto(mostrar);
          if (!mostrar) setCopiado(false);
        }}
        disparador={
          <Boton
            variante="fantasma"
            className="text-muted-foreground -ms-3"
            aria-label={`Avisar de un dato de ${carrera}`}
          >
            <Flag aria-hidden="true" />
            Avisar de un dato
          </Boton>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="font-semibold">{carrera}</p>
          <p className="text-muted-foreground">
            Contanos qué dato habría que revisar. El correo ya incluye el nombre de la carrera.
          </p>
          <div className="flex flex-wrap items-center gap-x-2">
            <span className="select-all">{CONTACTO.correo}</span>
            <BotonIcono
              etiqueta={copiado ? "Dirección copiada" : "Copiar la dirección de correo"}
              onClick={() => void copiar()}
            >
              {copiado ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            </BotonIcono>
            <span role="status" className="sr-only">
              {copiado ? "Dirección copiada" : ""}
            </span>
          </div>
          <a
            href={correoDatoDesactualizado(carrera)}
            className={clasesBoton("primario", "self-start")}
          >
            <Mail aria-hidden="true" />
            Abrir correo
          </a>
        </div>
      </Dialogo>
    </div>
  );
}
