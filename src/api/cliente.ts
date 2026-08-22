/**
 * Cliente HTTP del backend.
 *
 * Agrega el token de identidad a cada pedido y trata el 401 de una sola forma
 * en toda la aplicación: la sesión se descarta. Si cada pantalla resolviera eso
 * por su cuenta, tarde o temprano alguna se olvidaría y el usuario quedaría
 * mirando una pantalla vacía sin saber que tiene que volver a entrar.
 */

import { borrarToken, obtenerToken } from "../auth/sesion";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

/** El backend respondió que la credencial ya no vale. */
export class SesionVencida extends Error {
  constructor() {
    super("La sesión venció. Volvé a ingresar.");
    this.name = "SesionVencida";
  }
}

/** El backend respondió con un error distinto de 401. */
export class ErrorDeApi extends Error {
  constructor(
    readonly estado: number,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "ErrorDeApi";
  }
}

export async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const token = obtenerToken();
  const cabeceras = new Headers(opciones.headers);
  if (token) cabeceras.set("Authorization", `Bearer ${token}`);

  const respuesta = await fetch(`${BASE}${ruta}`, { ...opciones, headers: cabeceras });

  if (respuesta.status === 401) {
    borrarToken();
    throw new SesionVencida();
  }
  if (!respuesta.ok) {
    throw new ErrorDeApi(respuesta.status, await leerDetalle(respuesta));
  }
  // 204 y compañía no traen cuerpo: parsearlo tiraría un error de JSON.
  if (respuesta.status === 204) return undefined as T;
  return (await respuesta.json()) as T;
}

async function leerDetalle(respuesta: Response): Promise<string> {
  try {
    const cuerpo: unknown = await respuesta.json();
    if (typeof cuerpo === "object" && cuerpo !== null && "detail" in cuerpo) {
      return String((cuerpo as { detail: unknown }).detail);
    }
  } catch {
    // El cuerpo no era JSON. El código de estado alcanza.
  }
  return `El servidor respondió ${respuesta.status}.`;
}

export interface Usuario {
  identificador_opaco: string;
  proveedor: string;
}

/** Verifica el token contra el backend y devuelve el identificador opaco. */
export function consultarUsuario(): Promise<Usuario> {
  return pedir<Usuario>("/api/identidad/yo");
}

/** Corta las sesiones vigentes en el backend. No da de baja la cuenta. */
export function cerrarSesionEnBackend(): Promise<void> {
  return pedir<void>("/api/identidad/salir", { method: "POST" });
}

/**
 * Registra el consentimiento informado y crea la identidad (HU-03a).
 *
 * Es el único pedido que hace nacer un dato personal del otro lado: hasta que
 * esto ocurre, el backend no guarda ni el correo ni el nombre. Por eso el
 * resto de la API responde 403 mientras no se haya llamado.
 */
export function registrarConsentimiento(version: string): Promise<Usuario> {
  return pedir<Usuario>("/api/identidad/consentimiento", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version }),
  });
}
