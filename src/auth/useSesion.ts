/**
 * Estado de sesión para los componentes.
 *
 * El nombre arranca con `use` y no con `usar` porque React lo exige: la regla
 * `react-hooks/rules-of-hooks` identifica los hooks por el prefijo, y con un
 * nombre en español dejaría de verificar este archivo. Es la misma clase de
 * excepción que `__tablename__` en el backend.
 *
 * Tener el token no es lo mismo que estar autenticado: puede estar vencido, o
 * revocado desde otro dispositivo. Por eso el hook lo contrasta contra el
 * backend antes de decir que hay sesión, y arranca en `verificando` en lugar
 * de asumir que sí.
 */

import { useCallback, useEffect, useState } from "react";

import {
  cerrarSesionEnBackend,
  consultarUsuario,
  ErrorDeApi,
  registrarConsentimiento,
  type Usuario,
} from "../api/cliente";
import { versionAceptada } from "../hooks/useAvisoAceptado";
import { alCambiarSesion, borrarToken, guardarToken, obtenerToken } from "./sesion";

export type EstadoSesion =
  { estado: "verificando" } | { estado: "anonimo" } | { estado: "autenticado"; usuario: Usuario };

export function useSesion(): {
  sesion: EstadoSesion;
  ingresar: (token: string) => void;
  salir: () => Promise<void>;
} {
  const [sesion, setSesion] = useState<EstadoSesion>({ estado: "verificando" });

  const verificar = useCallback(async () => {
    if (!obtenerToken()) {
      setSesion({ estado: "anonimo" });
      return;
    }
    try {
      setSesion({ estado: "autenticado", usuario: await consultarUsuario() });
      return;
    } catch (error) {
      // 403 es «la credencial vale pero falta el consentimiento» (HU-03a), y
      // se puede resolver sin molestar a nadie: la persona ya lo dio al
      // atravesar la puerta antes de ingresar. Se registra y se reintenta.
      //
      // Se manda la versión que efectivamente aceptó y no la vigente: si el
      // aviso cambió, la puerta se le vuelve a mostrar y consiente de nuevo.
      const version =
        error instanceof ErrorDeApi && error.estado === 403 ? versionAceptada() : null;
      if (version !== null) {
        try {
          setSesion({ estado: "autenticado", usuario: await registrarConsentimiento(version) });
          return;
        } catch {
          // Cae al anónimo de abajo, como cualquier otro fallo.
        }
      }
    }
    // `pedir` ya borró el token si fue un 401. Ante cualquier otro fallo
    // tampoco se puede afirmar que haya sesión.
    setSesion({ estado: "anonimo" });
  }, []);

  useEffect(() => {
    void verificar();
    return alCambiarSesion(() => void verificar());
  }, [verificar]);

  const ingresar = useCallback((token: string) => {
    // `guardarToken` notifica y eso dispara la verificación de arriba.
    guardarToken(token);
  }, []);

  const salir = useCallback(async () => {
    try {
      await cerrarSesionEnBackend();
    } finally {
      // Aunque el backend no haya respondido, el token local se descarta: no
      // dejarlo sería peor que un registro de revocación faltante.
      borrarToken();
    }
  }, []);

  return { sesion, ingresar, salir };
}
