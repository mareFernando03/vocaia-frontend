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

import { cerrarSesionEnBackend, consultarUsuario, type Usuario } from "../api/cliente";
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
    } catch {
      // `pedir` ya borró el token si fue un 401. Ante cualquier otro fallo
      // tampoco se puede afirmar que haya sesión.
      setSesion({ estado: "anonimo" });
    }
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
