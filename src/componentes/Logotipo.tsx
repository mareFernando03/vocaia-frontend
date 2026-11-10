import { cn } from "../lib/cn";

/**
 * La marca de VocaIA: un globo de diálogo con un punto ámbar, y el nombre.
 *
 * El dibujo es decorativo —el nombre está escrito al lado—, así que va oculto
 * para el lector de pantalla. Usa los tokens de color y no literales: en el
 * tema oscuro cambia solo.
 */
export function Logotipo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-2", className)}>
      <svg aria-hidden="true" viewBox="0 0 32 32" className="size-8">
        <rect width="32" height="32" rx="8" className="fill-primary" />
        <path
          d="M9 10.5h14a2.5 2.5 0 0 1 2.5 2.5v6a2.5 2.5 0 0 1-2.5 2.5h-6.5L12 25v-3.5H9A2.5 2.5 0 0 1 6.5 19v-6A2.5 2.5 0 0 1 9 10.5Z"
          className="fill-primary-foreground"
        />
        <circle cx="22.5" cy="9.5" r="3.5" className="fill-accent-strong" />
      </svg>
      <span className="text-foreground hidden text-base font-semibold tracking-tight min-[400px]:inline">
        VocaIA
      </span>
    </span>
  );
}
