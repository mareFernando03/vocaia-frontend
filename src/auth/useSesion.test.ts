import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ErrorDeApi, SesionVencida } from "../api/cliente";
import { AVISO } from "../contenido/aviso-ia";
import { useAvisoAceptado } from "../hooks/useAvisoAceptado";
import { borrarToken, guardarToken } from "./sesion";
import { INGRESO_RECHAZADO, SIN_RESPUESTA, useSesion } from "./useSesion";

/**
 * El enganche del consentimiento (HU-03a).
 *
 * El backend responde 403 mientras la persona no haya consentido, y eso el
 * frontend lo resuelve solo: la aceptación ya ocurrió al atravesar la puerta
 * antes de ingresar. Es la clase de recorrido que se rompe sin que ninguna
 * pantalla lo muestre, porque termina en «anónimo» y parece un token vencido.
 */

const { consultarUsuario, registrarConsentimiento, cerrarSesionEnBackend } = vi.hoisted(() => ({
  consultarUsuario: vi.fn(),
  registrarConsentimiento: vi.fn(),
  cerrarSesionEnBackend: vi.fn(),
}));

vi.mock("../api/cliente", async (importar) => ({
  ...(await importar<typeof import("../api/cliente")>()),
  consultarUsuario,
  registrarConsentimiento,
  cerrarSesionEnBackend,
}));

const USUARIO = { identificador_opaco: "opaco-1", proveedor: "google" };

afterEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
});

describe("useSesion · consentimiento", () => {
  it("ante un 403 registra el consentimiento aceptado y reintenta", async () => {
    guardarToken("token-de-prueba");
    window.sessionStorage.setItem("vocaia:aviso-ia:aceptado", AVISO.version);
    consultarUsuario.mockRejectedValue(new ErrorDeApi(403, "Falta el consentimiento."));
    registrarConsentimiento.mockResolvedValue(USUARIO);

    const { result } = renderHook(() => useSesion());

    await waitFor(() => expect(result.current.sesion.estado).toBe("autenticado"));
    expect(registrarConsentimiento).toHaveBeenCalledWith(AVISO.version);
  });

  it("ante un 403, una versión vieja aceptada no se registra (VOCAIA-102)", async () => {
    // Aceptó el aviso anterior y el registro no llegó. Registrarlo ahora
    // crearía la identidad con un consentimiento a un texto que ya no se
    // muestra: se espera a que atraviese la puerta nueva.
    guardarToken("token-de-prueba");
    window.sessionStorage.setItem("vocaia:aviso-ia:aceptado", "aviso-v1");
    consultarUsuario.mockRejectedValue(new ErrorDeApi(403, "Falta el consentimiento."));

    const { result } = renderHook(() => useSesion());

    await waitFor(() => expect(result.current.sesion.estado).toBe("anonimo"));
    expect(registrarConsentimiento).not.toHaveBeenCalled();
  });

  it("sin aviso aceptado no consiente por su cuenta", async () => {
    // Es el punto entero de la historia: el consentimiento lo da la persona.
    // Si el almacenamiento se perdió, se vuelve a anónimo y la puerta reaparece.
    guardarToken("token-de-prueba");
    consultarUsuario.mockRejectedValue(new ErrorDeApi(403, "Falta el consentimiento."));

    const { result } = renderHook(() => useSesion());

    await waitFor(() => expect(result.current.sesion.estado).toBe("anonimo"));
    expect(registrarConsentimiento).not.toHaveBeenCalled();
  });

  it("un 401 no dispara el registro de consentimiento", async () => {
    // Un token vencido no se arregla consintiendo: hay que volver a ingresar.
    guardarToken("token-de-prueba");
    window.sessionStorage.setItem("vocaia:aviso-ia:aceptado", "aviso-v1");
    consultarUsuario.mockRejectedValue(new ErrorDeApi(401, "Credencial inválida."));

    const { result } = renderHook(() => useSesion());

    await waitFor(() => expect(result.current.sesion.estado).toBe("anonimo"));
    expect(registrarConsentimiento).not.toHaveBeenCalled();
  });
});

/**
 * VOCAIA-102 · quien ya consintió una versión vieja nunca recibe el 403.
 *
 * Tiene identidad, así que entra derecho. Lo que lo delata es la versión que
 * el backend dice tener registrada: si no es la que la persona acaba de
 * aceptar, hay que registrarla, o el vault dice que consintió un texto que ya
 * no es el que leyó.
 */
describe("useSesion · el registro sigue al aviso vigente", () => {
  it("si lo registrado es otra versión, registra la aceptada", async () => {
    guardarToken("token-de-prueba");
    consultarUsuario.mockResolvedValue({ ...USUARIO, consentimiento_version: "aviso-v1" });
    registrarConsentimiento.mockResolvedValue({ ...USUARIO, consentimiento_version: "aviso-v2" });

    const { result } = renderHook(() => useSesion("aviso-v2"));

    await waitFor(() => expect(registrarConsentimiento).toHaveBeenCalledWith("aviso-v2"));
    await waitFor(() =>
      expect(result.current.sesion).toEqual({
        estado: "autenticado",
        usuario: { ...USUARIO, consentimiento_version: "aviso-v2" },
      }),
    );
    expect(registrarConsentimiento).toHaveBeenCalledTimes(1);
  });

  it("si coincide, no vuelve a registrar", async () => {
    guardarToken("token-de-prueba");
    consultarUsuario.mockResolvedValue({ ...USUARIO, consentimiento_version: "aviso-v2" });

    const { result } = renderHook(() => useSesion("aviso-v2"));

    await waitFor(() => expect(result.current.sesion.estado).toBe("autenticado"));
    expect(registrarConsentimiento).not.toHaveBeenCalled();
  });

  it("con la puerta abierta no registra nada", async () => {
    // Sin la versión vigente aceptada, lo único que hay es lo que la persona
    // aceptó antes del cambio: registrarlo bajaría la versión de alguien que
    // quizá ya consintió la nueva en otro dispositivo.
    guardarToken("token-de-prueba");
    window.sessionStorage.setItem("vocaia:aviso-ia:aceptado", "aviso-v1");
    consultarUsuario.mockResolvedValue({ ...USUARIO, consentimiento_version: "aviso-v2" });

    const { result } = renderHook(() => useSesion(null));

    await waitFor(() => expect(result.current.sesion.estado).toBe("autenticado"));
    expect(registrarConsentimiento).not.toHaveBeenCalled();
  });

  it("registra también si la puerta se acepta con la sesión ya abierta", async () => {
    guardarToken("token-de-prueba");
    consultarUsuario.mockResolvedValue({ ...USUARIO, consentimiento_version: "aviso-v1" });
    registrarConsentimiento.mockResolvedValue({ ...USUARIO, consentimiento_version: "aviso-v2" });

    const { result, rerender } = renderHook(({ aviso }) => useSesion(aviso), {
      initialProps: { aviso: null as string | null },
    });
    await waitFor(() => expect(result.current.sesion.estado).toBe("autenticado"));
    expect(registrarConsentimiento).not.toHaveBeenCalled();

    rerender({ aviso: "aviso-v2" });

    await waitFor(() => expect(registrarConsentimiento).toHaveBeenCalledWith("aviso-v2"));
  });

  it("quien entra después en la misma pestaña también se registra", async () => {
    // La marca de «ya se intentó» no puede sobrevivir a la sesión: si A
    // aceptó y salió, B entra con su propia versión registrada.
    const PERSONA_B = { identificador_opaco: "opaco-2", proveedor: "google" };
    guardarToken("token-a");
    consultarUsuario.mockResolvedValue({ ...USUARIO, consentimiento_version: "aviso-v1" });
    registrarConsentimiento.mockResolvedValue({ ...USUARIO, consentimiento_version: "aviso-v2" });
    const { result } = renderHook(() => useSesion("aviso-v2"));
    await waitFor(() => expect(registrarConsentimiento).toHaveBeenCalledTimes(1));

    borrarToken();
    await waitFor(() => expect(result.current.sesion.estado).toBe("anonimo"));
    consultarUsuario.mockResolvedValue({ ...PERSONA_B, consentimiento_version: "aviso-v1" });
    registrarConsentimiento.mockResolvedValue({ ...PERSONA_B, consentimiento_version: "aviso-v2" });
    result.current.ingresar("token-b");

    await waitFor(() => expect(registrarConsentimiento).toHaveBeenCalledTimes(2));
  });

  it("tras un 401, quien entra después en la pestaña no hereda el consentimiento (VOCAIA-102)", async () => {
    // A aceptó la puerta y su token vence sin que toque «Salir». Si la
    // aceptación quedara, B entraría sin ver la puerta y su 403 le registraría
    // el consentimiento a un aviso que no leyó. Se arman los dos hooks juntos,
    // como en App, porque el defecto vive en cómo se combinan.
    const PERSONA_B = { identificador_opaco: "opaco-2", proveedor: "google" };
    const { result } = renderHook(() => {
      const aviso = useAvisoAceptado();
      return { aviso, sesion: useSesion(aviso.aceptado ? aviso.version : null) };
    });
    act(() => result.current.aviso.aceptar());
    consultarUsuario.mockResolvedValue({ ...USUARIO, consentimiento_version: AVISO.version });
    act(() => result.current.sesion.ingresar("token-a"));
    await waitFor(() => expect(result.current.sesion.sesion.estado).toBe("autenticado"));

    // Es lo que hace `pedir` ante un 401: borra el token y avisa.
    act(() => borrarToken());
    await waitFor(() => expect(result.current.sesion.sesion.estado).toBe("anonimo"));
    expect(result.current.aviso.aceptado).toBe(false);

    consultarUsuario.mockRejectedValue(new ErrorDeApi(403, "Falta el consentimiento."));
    registrarConsentimiento.mockResolvedValue({
      ...PERSONA_B,
      consentimiento_version: AVISO.version,
    });
    act(() => result.current.sesion.ingresar("token-b"));

    await waitFor(() => expect(consultarUsuario).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.sesion.sesion.estado).toBe("anonimo"));
    expect(registrarConsentimiento).not.toHaveBeenCalled();
    expect(result.current.aviso.aceptado).toBe(false);
  });

  it("una respuesta que llega después de salir no reabre la sesión", async () => {
    guardarToken("token-de-prueba");
    consultarUsuario.mockResolvedValue({ ...USUARIO, consentimiento_version: "aviso-v1" });
    let responder: (usuario: unknown) => void = () => {};
    registrarConsentimiento.mockReturnValue(
      new Promise((resolver) => {
        responder = resolver;
      }),
    );
    const { result } = renderHook(() => useSesion("aviso-v2"));
    await waitFor(() => expect(registrarConsentimiento).toHaveBeenCalledTimes(1));

    borrarToken();
    await waitFor(() => expect(result.current.sesion.estado).toBe("anonimo"));
    responder({ ...USUARIO, consentimiento_version: "aviso-v2" });
    await new Promise((listo) => setTimeout(listo, 0));

    expect(result.current.sesion.estado).toBe("anonimo");
  });

  it("si el registro da 401, dice por qué volvió al ingreso", async () => {
    guardarToken("token-de-prueba");
    consultarUsuario.mockResolvedValue({ ...USUARIO, consentimiento_version: "aviso-v1" });
    registrarConsentimiento.mockImplementation(() => {
      // Es lo que hace `pedir` ante un 401: borra el token y avisa.
      borrarToken();
      return Promise.reject(new SesionVencida());
    });

    const { result } = renderHook(() => useSesion("aviso-v2"));

    await waitFor(() => expect(result.current.sesion.estado).toBe("anonimo"));
    await waitFor(() => expect(result.current.error).toBe(INGRESO_RECHAZADO));
  });

  it("si el registro falla, la sesión sigue y no reintenta en cada render", async () => {
    guardarToken("token-de-prueba");
    consultarUsuario.mockResolvedValue({ ...USUARIO, consentimiento_version: "aviso-v1" });
    registrarConsentimiento.mockRejectedValue(new TypeError("Failed to fetch"));

    const { result, rerender } = renderHook(() => useSesion("aviso-v2"));
    await waitFor(() => expect(registrarConsentimiento).toHaveBeenCalledTimes(1));
    rerender();

    expect(result.current.sesion.estado).toBe("autenticado");
    expect(result.current.error).toBeNull();
    expect(registrarConsentimiento).toHaveBeenCalledTimes(1);
  });
});

/**
 * VOCAIA-131 · un ingreso rechazado dejaba de verse.
 *
 * Volver a «anónimo» es correcto —no hay sesión— pero es indistinguible de no
 * haber ingresado nunca, y eso es lo que dejaba a la persona reintentando sin
 * saber por qué. Lo que se prueba es que quede el motivo para mostrar.
 */
describe("useSesion · un intento rechazado se puede contar", () => {
  it("deja el motivo cuando el backend rechaza la credencial", async () => {
    guardarToken("token-de-prueba");
    consultarUsuario.mockRejectedValue(new ErrorDeApi(401, "Credencial inválida."));

    const { result } = renderHook(() => useSesion());

    await waitFor(() => expect(result.current.sesion.estado).toBe("anonimo"));
    expect(result.current.error).toBe(INGRESO_RECHAZADO);
  });

  it("sin token no hay intento que contar", async () => {
    // Quien entra por primera vez no tiene que leer un error.
    const { result } = renderHook(() => useSesion());

    await waitFor(() => expect(result.current.sesion.estado).toBe("anonimo"));
    expect(result.current.error).toBeNull();
  });

  it("al reintentar se limpia el mensaje del intento anterior", async () => {
    guardarToken("token-de-prueba");
    consultarUsuario.mockRejectedValue(new ErrorDeApi(401, "Credencial inválida."));
    const { result } = renderHook(() => useSesion());
    await waitFor(() => expect(result.current.error).toBe(INGRESO_RECHAZADO));

    consultarUsuario.mockResolvedValue(USUARIO);
    result.current.ingresar("otro-token");

    await waitFor(() => expect(result.current.sesion.estado).toBe("autenticado"));
    expect(result.current.error).toBeNull();
  });
});

describe("useSesion · un servidor que no contesta no es una credencial rechazada", () => {
  it("cuando no hubo respuesta lo dice, y no manda a mirar el reloj", async () => {
    guardarToken("token-de-prueba");
    // Lo que levanta `fetch` cuando no hay con quién hablar no es un `ErrorDeApi`.
    consultarUsuario.mockRejectedValue(new TypeError("Failed to fetch"));

    const { result } = renderHook(() => useSesion());

    await waitFor(() => expect(result.current.sesion.estado).toBe("anonimo"));
    expect(result.current.error).toBe(SIN_RESPUESTA);
    expect(result.current.error).not.toContain("reloj");
  });

  it("si el consentimiento se cae sin respuesta, tampoco culpa a la credencial", async () => {
    guardarToken("token-de-prueba");
    window.sessionStorage.setItem("vocaia:aviso-ia:aceptado", AVISO.version);
    consultarUsuario.mockRejectedValue(new ErrorDeApi(403, "falta consentimiento"));
    registrarConsentimiento.mockRejectedValue(new TypeError("Failed to fetch"));

    const { result } = renderHook(() => useSesion());

    await waitFor(() => expect(result.current.sesion.estado).toBe("anonimo"));
    expect(result.current.error).toBe(SIN_RESPUESTA);
  });
});
