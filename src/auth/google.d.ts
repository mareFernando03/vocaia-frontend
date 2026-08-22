/**
 * Tipos mínimos de Google Identity Services.
 *
 * La biblioteca se carga por `<script>` desde el dominio de Google y no tiene
 * paquete de npm oficial. Se declara acá solo lo que usamos: `@types/google.accounts`
 * existe, pero traer una dependencia entera para tres firmas es peor negocio
 * que mantener estas veinte líneas.
 */

declare namespace google.accounts.id {
  interface RespuestaCredencial {
    /** Token de identidad (JWT) firmado por Google. Es lo que verifica el backend. */
    credential: string;
    select_by: string;
  }

  interface ConfiguracionInicial {
    client_id: string;
    callback: (respuesta: RespuestaCredencial) => void;
    /** Deshabilita el diálogo automático: el ingreso lo dispara la persona. */
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }

  interface OpcionesBoton {
    type?: "standard" | "icon";
    theme?: "outline" | "filled_blue" | "filled_black";
    size?: "small" | "medium" | "large";
    text?: "signin_with" | "signup_with" | "continue_with";
    shape?: "rectangular" | "pill";
    locale?: string;
    width?: number;
  }

  function initialize(configuracion: ConfiguracionInicial): void;
  function renderButton(elemento: HTMLElement, opciones: OpcionesBoton): void;
  function disableAutoSelect(): void;
}
