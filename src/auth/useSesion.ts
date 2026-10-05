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

import { useCallback, useEffect, useRef, useState } from "react";

import {
  cerrarSesionEnBackend,
  consultarUsuario,
  ErrorDeApi,
  registrarConsentimiento,
  type Usuario,
} from "../api/cliente";
import { AVISO } from "../contenido/aviso-ia";
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

/**
 * `avisoVigenteAceptado` es la versión del aviso que la persona aceptó en esta
 * sesión, **solo si es la vigente**, o `null` mientras la puerta siga abierta.
 * La pasa `App`, que es quien sabe si la puerta se atravesó.
 */
export function useSesion(avisoVigenteAceptado: string | null = null): {
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
      // Solo si lo aceptado es la versión vigente (VOCAIA-102). Una aceptada
      // antes de un cambio del aviso no es la que la persona tiene delante, y
      // registrarla crearía la identidad con un consentimiento a un texto que
      // ya no se muestra. Con la puerta abierta se espera a que la atraviese.
      const aceptada = versionAceptada();
      const version =
        fallo instanceof ErrorDeApi && fallo.estado === 403 && aceptada === AVISO.version
          ? aceptada
          : null;
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

  // Registra de nuevo el consentimiento si el aviso cambió (VOCAIA-102).
  //
  // El 403 de arriba no alcanza: lo recibe quien nunca consintió, pero quien
  // aceptó una versión anterior ya tiene identidad y entra sin 403. La puerta
  // se le vuelve a mostrar y acepta el aviso nuevo, pero el registro seguiría
  // diciendo que aceptó el viejo. Por eso se compara lo registrado con lo
  // aceptado, y si difieren se registra lo aceptado.
  //
  // Es un efecto y no un paso de `verificar` porque la persona puede aceptar
  // la puerta con la sesión ya abierta, y ahí no se vuelve a verificar nada.
  // Solo se registra la versión vigente: una aceptada antes de un cambio del
  // aviso no es la que la persona tiene delante, y registrarla bajaría la
  // versión de alguien que ya consintió la nueva en otro dispositivo.
  //
  // Se intenta una vez por persona y versión, y la marca se borra al quedar
  // sin sesión: si no, quien entra después en la misma pestaña —u otra vez la
  // misma persona, tras un intento fallido— no se registraría nunca. Si falla
  // por la red, la sesión sigue —la persona ya está autenticada con un
  // consentimiento válido— y el próximo ingreso lo vuelve a intentar: cortarle
  // la sesión por un registro que se puede repetir sería castigarla por un
  // problema de red. Y si el backend no informa la versión, no se queda
  // registrando en cada render.
  //
  // La respuesta se descarta si mientras tanto cambió el token: llegar después
  // de «salir» y marcar la sesión como abierta mostraría la aplicación sin
  // credencial.
  const intentada = useRef<string | null>(null);
  const usuario = sesion.estado === "autenticado" ? sesion.usuario : null;
  const identificador = usuario?.identificador_opaco ?? null;
  const registrada = usuario?.consentimiento_version ?? null;
  useEffect(() => {
    if (identificador === null) {
      intentada.current = null;
      return;
    }
    if (avisoVigenteAceptado === null || registrada === avisoVigenteAceptado) return;
    const clave = `${identificador}:${avisoVigenteAceptado}`;
    if (intentada.current === clave) return;
    intentada.current = clave;
    const token = obtenerToken();
    registrarConsentimiento(avisoVigenteAceptado).then(
      (actualizado) => {
        if (obtenerToken() === token) setSesion({ estado: "autenticado", usuario: actualizado });
      },
      () => {
        // Un 401 ya borró el token y la verificación vuelve al ingreso: se le
        // dice por qué, en vez de sacarla sin explicación. Cualquier otro
        // fallo se reintenta en el próximo ingreso (ver arriba).
        if (obtenerToken() === null) setError(INGRESO_RECHAZADO);
      },
    );
  }, [identificador, registrada, avisoVigenteAceptado]);

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
