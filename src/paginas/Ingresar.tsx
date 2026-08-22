/**
 * Pantalla de ingreso.
 *
 * El botón lo dibuja Google, no nosotros: sus lineamientos de marca lo exigen
 * y además es lo que la gente reconoce. Nuestro trabajo es cargar el script,
 * decirle dónde ponerlo, y recibir el token.
 */

import { useEffect, useRef, useState } from "react";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
const URL_SCRIPT = "https://accounts.google.com/gsi/client";

interface Propiedades {
  alIngresar: (token: string) => void;
}

export default function Ingresar({ alIngresar }: Propiedades) {
  const contenedorBoton = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!CLIENT_ID) {
      setError(
        "Falta VITE_GOOGLE_CLIENT_ID. Copiá .env.example a .env.local y cargá el " +
          "identificador de cliente de Google Cloud Console.",
      );
      return;
    }

    let cancelado = false;

    void cargarScript()
      .then(() => {
        if (cancelado || !contenedorBoton.current) return;
        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (respuesta) => alIngresar(respuesta.credential),
          // El ingreso lo dispara la persona. El diálogo automático de Google
          // aparece encima del contenido sin que nadie lo haya pedido.
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        google.accounts.id.renderButton(contenedorBoton.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          locale: "es",
        });
      })
      .catch(() => {
        if (!cancelado) {
          setError(
            "No se pudo cargar el ingreso de Google. Revisá tu conexión o si alguna " +
              "extensión del navegador lo está bloqueando.",
          );
        }
      });

    return () => {
      cancelado = true;
    };
  }, [alIngresar]);

  // Sin `<main>` ni `min-h-screen`: el armazón de `App` ya aporta el landmark y
  // el alto. Anidar otro `<main>` deja dos landmarks principales en la página.
  return (
    <div className="mx-auto w-full max-w-sm text-center">
      <h1 className="text-2xl font-semibold">VocaIA</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Entrá con una cuenta que ya tenés. No vas a tener que inventar otra contraseña.
      </p>

      <div ref={contenedorBoton} className="mt-8 flex justify-center" />

      {error && (
        <p role="alert" className="text-destructive mt-6 text-sm">
          {error}
        </p>
      )}

      {/* Acá iba una línea avisando que se conversa con una IA. La franja
          persistente de HU-02 la dice justo arriba, en todas las pantallas:
          repetirla no agrega divulgación, solo dos textos que se contradicen
          el día que alguien edite uno solo. */}
    </div>
  );
}

/** Carga el script de Google una sola vez, aunque el componente se remonte. */
function cargarScript(): Promise<void> {
  const existente = document.querySelector<HTMLScriptElement>(`script[src="${URL_SCRIPT}"]`);
  if (existente) {
    return existente.dataset.cargado === "si" ? Promise.resolve() : esperar(existente);
  }

  const script = document.createElement("script");
  script.src = URL_SCRIPT;
  script.async = true;
  script.defer = true;
  const promesa = esperar(script);
  document.head.appendChild(script);
  return promesa;
}

function esperar(script: HTMLScriptElement): Promise<void> {
  return new Promise((resolver, rechazar) => {
    script.addEventListener("load", () => {
      script.dataset.cargado = "si";
      resolver();
    });
    script.addEventListener("error", () => rechazar(new Error("No cargó el script de Google.")));
  });
}
