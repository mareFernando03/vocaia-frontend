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

/**
 * Lo que se le dice a alguien cuya credencial el backend rechazó.
 *
 * No se le muestra el motivo técnico —qué reclamo falló, qué respondió el
 * proveedor— porque no lo puede accionar, pero sí lo único que sí puede
 * revisar. Es el defecto VOCAIA-131: el ingreso fallaba en silencio y el
 * motivo aparecía sólo en el registro del servidor.
 */
export const INGRESO_RECHAZADO =
  "No pudimos validar tu ingreso. Probá de nuevo; si vuelve a fallar, puede ser que el reloj " +
  "de tu computadora esté desfasado.";

/**
 * Lo que se le dice cuando el backend no llegó a contestar.
 *
 * Es otro problema y tiene otra acción: mandarla a mirar el reloj de su
 * máquina cuando lo que pasa es que el servidor no responde la deja tocando
 * lo único que no va a arreglar nada. La distinción se puede hacer porque
 * `pedir` sólo levanta `ErrorDeApi` cuando hubo respuesta.
 */
export const SIN_RESPUESTA =
  "No pudimos conectarnos para validar tu ingreso. Revisá tu conexión y probá de nuevo.";

export function useSesion(): {
  sesion: EstadoSesion;
  error: string | null;
  ingresar: (token: string) => void;
  salir: () => Promise<void>;
} {
  const [sesion, setSesion] = useState<EstadoSesion>({ estado: "verificando" });
  const [error, setError] = useState<string | null>(null);

  const verificar = useCallback(async () => {
    if (!obtenerToken()) {
      setSesion({ estado: "anonimo" });
      return;
    }
    // `catch (fallo)` y no `catch (error)`: acá adentro `error` sería el estado
    // del hook, y taparlo en el bloque que decide qué mensaje mostrar es el
    // lugar exacto donde no conviene tener dos cosas con el mismo nombre.
    let huboRespuesta = false;
    try {
      setSesion({ estado: "autenticado", usuario: await consultarUsuario() });
      setError(null);
      return;
    } catch (fallo) {
      huboRespuesta = fallo instanceof ErrorDeApi;
      // 403 es «la credencial vale pero falta el consentimiento» (HU-03a), y
      // se puede resolver sin molestar a nadie: la persona ya lo dio al
      // atravesar la puerta antes de ingresar. Se registra y se reintenta.
      //
      // Se manda la versión que efectivamente aceptó y no la vigente: si el
      // aviso cambió, la puerta se le vuelve a mostrar y consiente de nuevo.
      const version =
        fallo instanceof ErrorDeApi && fallo.estado === 403 ? versionAceptada() : null;
      if (version !== null) {
        try {
          setSesion({ estado: "autenticado", usuario: await registrarConsentimiento(version) });
          return;
        } catch (segundoFallo) {
          // Cae al anónimo de abajo, como cualquier otro fallo.
          huboRespuesta = segundoFallo instanceof ErrorDeApi;
        }
      }
    }
    // `pedir` ya borró el token si fue un 401. Ante cualquier otro fallo
    // tampoco se puede afirmar que haya sesión.
    //
    // Había un token y no sirvió, así que esto no es «todavía no ingresó»:
    // es un intento rechazado, y la pantalla de ingreso tiene que poder
    // decirlo. Volver a anónimo sin más es lo que hacía que la persona
    // reintentara creyendo que el botón estaba roto.
    setSesion({ estado: "anonimo" });
    setError(huboRespuesta ? INGRESO_RECHAZADO : SIN_RESPUESTA);
  }, []);

  useEffect(() => {
    void verificar();
    return alCambiarSesion(() => void verificar());
  }, [verificar]);

  const ingresar = useCallback((token: string) => {
    // Se limpia antes de reintentar: dejar el mensaje del intento anterior
    // mientras este se verifica diría que ya falló, y todavía no se sabe.
    setError(null);
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

  return { sesion, error, ingresar, salir };
}
