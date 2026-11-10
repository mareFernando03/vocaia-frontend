/**
 * Descargar los datos de la persona (HU-04, S6-02 · VOCAIA-177).
 *
 * El archivo lo arma el backend (`GET /api/perfil/descarga`, ADR-014 §3). Acá
 * se pide con la credencial, como cualquier otro pedido, y se ofrece para
 * guardar: un enlace directo al backend no llevaría el token.
 */

import { useState } from "react";

import { describir } from "../api/cliente";
import { descargarMisDatos } from "../api/perfil";
import { DESCARGA } from "../contenido/descarga";
import { clasesBoton } from "./ui/clases-boton";

/** Ofrece el texto como un archivo para guardar, sin abrir otra pestaña. */
function guardar(nombre: string, contenido: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: "application/json" }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

export function DescargaDeDatos({ alGuardar = guardar }: { alGuardar?: typeof guardar }) {
  const [descargando, setDescargando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function descargar() {
    setDescargando(true);
    setAviso(null);
    setError(null);
    try {
      const { nombre, contenido } = await descargarMisDatos();
      alGuardar(nombre, contenido);
      setAviso(DESCARGA.listo(nombre));
    } catch (fallo) {
      setError(describir(fallo));
    } finally {
      setDescargando(false);
    }
  }

  return (
    <section
      aria-labelledby="descarga-titulo"
      className="border-border bg-surface shadow-tarjeta flex flex-col gap-3 rounded-2xl border p-4 text-sm sm:p-5"
    >
      <h2 id="descarga-titulo" className="text-base font-semibold">
        {DESCARGA.titulo}
      </h2>
      <p>{DESCARGA.explicacion}</p>
      <p className="text-muted-foreground">{DESCARGA.cuidado}</p>
      <div>
        <button
          type="button"
          onClick={() => void descargar()}
          disabled={descargando}
          className={clasesBoton("secundario")}
        >
          {descargando ? DESCARGA.descargando : DESCARGA.boton}
        </button>
      </div>
      <p role="status" className="empty:hidden">
        {aviso}
      </p>
      {error !== null && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
