import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ErrorDeApi } from "../api/cliente";
import { guardarToken } from "./sesion";
import { useSesion } from "./useSesion";

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
    window.sessionStorage.setItem("vocaia:aviso-ia:aceptado", "aviso-v1");
    consultarUsuario.mockRejectedValue(new ErrorDeApi(403, "Falta el consentimiento."));
    registrarConsentimiento.mockResolvedValue(USUARIO);

    const { result } = renderHook(() => useSesion());

    await waitFor(() => expect(result.current.sesion.estado).toBe("autenticado"));
    // Se manda la versión que la persona aceptó, no la vigente por defecto.
    expect(registrarConsentimiento).toHaveBeenCalledWith("aviso-v1");
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
