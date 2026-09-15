/** Separa la ubicación del final del texto de la fuente, si la trae. */
const UBICACION = /\s+—\s+(\S+)$/;

/**
 * Una fuente institucional tal como la arma el backend: «Ordenanza C.S. N.º
 * 1877 — http://…». Si trae dirección, el nombre es el enlace.
 */
export function Referencia({ texto }: { texto: string }) {
  const ubicacion = UBICACION.exec(texto);
  // Sin ubicación reconocible se muestra el texto entero y listo: una fuente
  // sin enlace se sigue pudiendo leer, y una fuente que no se muestra, no.
  if (ubicacion === null || !ubicacion[1].startsWith("http")) {
    return <span className="text-muted-foreground">{texto}</span>;
  }
  return (
    <a
      href={ubicacion[1]}
      target="_blank"
      rel="noreferrer"
      className="text-primary underline underline-offset-2"
    >
      {texto.slice(0, ubicacion.index)}
    </a>
  );
}
