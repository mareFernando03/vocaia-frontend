/**
 * Guarda el token de identidad y lo expone al resto de la aplicación.
 *
 * El token vive en `sessionStorage` y no en `localStorage`: se borra al cerrar
 * la pestaña. Para una herramienta que se usa en computadoras compartidas
 * —una sala de informática de la facultad, por ejemplo— dejar la sesión
 * abierta indefinidamente es un riesgo que no compensa la comodidad.
 *
 * No se guarda ningún dato personal: solo el token, que el backend traduce a
 * un identificador opaco.
 */

const CLAVE = "vocaia.token_identidad";

type Escucha = (token: string | null) => void;

const escuchas = new Set<Escucha>();

export function obtenerToken(): string | null {
  return sessionStorage.getItem(CLAVE);
}

export function guardarToken(token: string): void {
  sessionStorage.setItem(CLAVE, token);
  notificar(token);
}

export function borrarToken(): void {
  sessionStorage.removeItem(CLAVE);
  // Sin esto, Google vuelve a entrar sola en la próxima visita y «cerrar
  // sesión» no cierra nada. El guard es porque el script puede no haber
  // cargado todavía (o estar bloqueado por una extensión).
  if (typeof google !== "undefined") google.accounts.id.disableAutoSelect();
  notificar(null);
}

/** Avisa cuando la sesión cambia. Devuelve la función para dejar de escuchar. */
export function alCambiarSesion(escucha: Escucha): () => void {
  escuchas.add(escucha);
  return () => escuchas.delete(escucha);
}

function notificar(token: string | null): void {
  for (const escucha of escuchas) escucha(token);
}
