import type { MouseEventHandler, ComponentType } from "react";

/**
 * Botón de acción de la app.
 *
 * Las variantes reemplazan al patrón anterior de pisar los colores con
 * `className`: como Tailwind resuelve los conflictos por el orden en la hoja de
 * estilos y no por el orden del atributo, `bg-white` pisando a `bg-blue-500`
 * dependía de la suerte. Además los fondos están elegidos por contraste medido
 * contra texto blanco (AA pide 4.5:1 para texto normal):
 *
 *   blue-600  5.17:1   green-700  5.02:1   red-600  4.83:1   slate-600  7.58:1
 *
 * El `bg-blue-500` que se usaba antes daba 3.68:1, por debajo del mínimo.
 */
type ActionButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "neutral"
  | "danger";

interface ActionButtonProps {
  label: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  icon?: ComponentType<{ className?: string }>;
  variant?: ActionButtonVariant;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  title?: string;
}

const VARIANTES: Record<ActionButtonVariant, string> = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700 focus-visible:outline-blue-600",
  secondary:
    "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-blue-600",
  success:
    "bg-green-700 text-white hover:bg-green-800 focus-visible:outline-green-700",
  neutral:
    "bg-slate-600 text-white hover:bg-slate-700 focus-visible:outline-slate-600",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600",
};

// min-h-11 = 44px: alto cómodo para usar el POS con pantalla táctil.
const BASE =
  "inline-flex items-center justify-center gap-2 min-h-11 px-4 py-2 rounded-lg " +
  "text-sm font-medium whitespace-nowrap transition-colors duration-200 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

export default function ActionButton({
  label,
  onClick,
  icon: Icon,
  variant = "primary",
  className = "",
  disabled = false,
  type = "button",
  title,
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      type={type}
      title={title}
      disabled={disabled}
      className={`${BASE} ${VARIANTES[variant]} ${
        disabled ? "" : "cursor-pointer"
      } ${className}`}
    >
      {Icon && <Icon aria-hidden="true" className="w-5 h-5 shrink-0" />}
      {label}
    </button>
  );
}
