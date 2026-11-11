import { useEffect, useRef, useState } from "react";

import { describir, SesionVencida } from "../api/cliente";
import {
  consultarNotificacion,
  otorgarNotificacion,
  revocarNotificacion,
  type Notificacion,
} from "../api/notificacion";
import { TextoConsentimientoNotificacion } from "../componentes/ConsentimientoNotificacion";
import { clasesBoton } from "../componentes/ui/clases-boton";
import { Dialogo } from "../componentes/ui/Dialogo";
import { NOTIFICACION } from "../contenido/aviso-notificacion";
import { hayQuePreguntar, olvidarRechazo, recordarRechazo } from "../hooks/useAvisoPreguntado";

/**
 * Cuánto se espera la consulta antes de darla por fallida. Alcanza para el
 * arranque en frío de Render, que tarda de 30 a 50 segundos: con menos, el
 * primer ingreso del día fallaría casi siempre.
 */
export const TOPE_CONSULTA_MS = 60_000;

/**
 * La pregunta por el aviso a la Facultad, antes de empezar a chatear (S7-12,
 * VOCAIA-204, reunión con la Secretaría del 05/11).
 *
 * Ambas decisiones llevan a la conversación. El texto y la versión son los
 * mismos que se usan al cambiar la autorización desde Perfil.
 *
 * Si no hay nada que preguntar, sigue sola a la conversación, sin mostrarse.
 * Si la consulta falla —o no responde en `TOPE_CONSULTA_MS`— lo dice, y ofrece
 * reintentar o seguir igual. Seguir no da la pregunta por hecha: se repite al
 * recargar o en el próximo ingreso, y en el perfil sigue estando.
 */
export default function PreguntaAviso({
  cuenta,
  alSeguir,
  alFallarLaConsulta,
}: {
  cuenta: string;
  alSeguir: () => void;
  /** Seguir a la conversación después de un fallo, sin dar la pregunta por hecha. */
  alFallarLaConsulta: () => void;
}) {
  const [estado, setEstado] = useState<Notificacion | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  // Cuenta los fallos para que el mismo mensaje, repetido después de
  // «Reintentar», vuelva a insertarse y un lector de pantalla lo anuncie.
  const [fallos, setFallos] = useState(0);
  // Cambia con «Reintentar»: vuelve a correr la consulta.
  const [intento, setIntento] = useState(0);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const guardado = useRef<AbortController | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorAlGuardar, setErrorAlGuardar] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    const control = new AbortController();
    const tope = setTimeout(() => control.abort(), TOPE_CONSULTA_MS);
    consultarNotificacion({ signal: control.signal })
      .then(
        (estado) => {
          if (!vigente) return;
          setFallo(null);
          if (hayQuePreguntar(estado, cuenta)) setEstado(estado);
          else alSeguir();
        },
        (error: unknown) => {
          // La sesión vencida la resuelve App volviendo al ingreso.
          if (!vigente || error instanceof SesionVencida) return;
          setFallo(describir(error));
          setFallos((n) => n + 1);
        },
      )
      .finally(() => clearTimeout(tope));
    return () => {
      vigente = false;
      clearTimeout(tope);
      control.abort();
    };
  }, [intento, cuenta, alSeguir]);

  useEffect(
    () => () => {
      const pendiente = guardado.current;
      guardado.current = null;
      pendiente?.abort();
    },
    [],
  );

  const hayFallo = fallo !== null;
  useEffect(() => {
    // Después de «Reintentar» el aviso sigue montado y conserva el foco.
    if (hayFallo) tituloRef.current?.focus();
  }, [hayFallo]);

  async function decidir(autorizar: boolean) {
    if (guardado.current !== null) return;
    const control = new AbortController();
    guardado.current = control;
    setGuardando(true);
    setErrorAlGuardar(null);
    const tope = setTimeout(() => control.abort(), TOPE_CONSULTA_MS);
    try {
      const opciones = { signal: control.signal };
      // Revocar es idempotente. También cubre una autorización anterior o
      // una que se guardó aunque la respuesta al primer clic se haya cortado.
      const confirmado = autorizar
        ? await otorgarNotificacion(NOTIFICACION.version, opciones)
        : await revocarNotificacion(opciones);
      if (guardado.current !== control) return;
      const coincide = autorizar
        ? confirmado.vigente === true && confirmado.version === NOTIFICACION.version
        : confirmado.vigente === false;
      if (!coincide) {
        setErrorAlGuardar(NOTIFICACION.guardadoFallido);
        return;
      }
      if (autorizar || confirmado.revocado_en) olvidarRechazo(cuenta);
      else recordarRechazo(cuenta);
      alSeguir();
    } catch (error) {
      if (guardado.current !== control || error instanceof SesionVencida) return;
      setErrorAlGuardar(describir(error));
    } finally {
      clearTimeout(tope);
      if (guardado.current === control) {
        guardado.current = null;
        setGuardando(false);
      }
    }
  }

  if (fallo !== null) {
    return (
      <div className="flex flex-col gap-4">
        <h1 ref={tituloRef} tabIndex={-1} className="text-xl font-semibold outline-none">
          {NOTIFICACION.antesDeEmpezar}
        </h1>
        <div key={fallos} role="alert" className="flex flex-col gap-1 text-sm">
          <p className="text-destructive">
            {NOTIFICACION.consultaFallida} {fallo}
          </p>
          <p className="text-muted-foreground">{NOTIFICACION.consultaFallidaSeguir}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Reintentar deja el aviso a la vista hasta que llega la respuesta:
              si se borrara al empezar, el botón se desmontaría con el foco
              adentro y quien usa teclado caería al `body`. */}
          <button
            type="button"
            onClick={() => setIntento((n) => n + 1)}
            className={clasesBoton("secundario")}
          >
            {NOTIFICACION.reintentar}
          </button>
          <button type="button" onClick={alFallarLaConsulta} className={clasesBoton("secundario")}>
            {NOTIFICACION.seguir}
          </button>
        </div>
      </div>
    );
  }

  if (estado === null) {
    return <p className="text-muted-foreground text-sm">Preparando la conversación…</p>;
  }

  return (
    <Dialogo
      abierto
      titulo={NOTIFICACION.pregunta}
      className="max-h-[calc(100dvh-1rem)]"
      pie={
        <>
          {errorAlGuardar !== null && (
            <p role="alert" className="text-destructive mb-3">
              {errorAlGuardar}
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              aria-disabled={guardando}
              onClick={() => void decidir(true)}
              className={clasesBoton("secundario")}
            >
              {NOTIFICACION.autorizarYEmpezar}
            </button>
            <button
              type="button"
              aria-disabled={guardando}
              onClick={() => void decidir(false)}
              className={clasesBoton("secundario")}
            >
              {NOTIFICACION.empezarSinAutorizar}
            </button>
          </div>
          {guardando && (
            <p role="status" className="text-muted-foreground mt-2">
              {NOTIFICACION.guardandoDecision}
            </p>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <TextoConsentimientoNotificacion />
        <p className="text-muted-foreground">{NOTIFICACION.cambiarEnPerfil}</p>
        {estado.vigente && <p>{NOTIFICACION.versionAnterior}</p>}
      </div>
    </Dialogo>
  );
}
