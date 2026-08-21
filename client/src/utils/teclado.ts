import type { KeyboardEvent } from "react";

/**
 * Handler de teclado para elementos que actúan como botón pero no lo son
 * (filas de tabla o tarjetas seleccionables, donde no se puede envolver todo
 * en un <button> sin romper la semántica de la tabla).
 *
 * Acompañar siempre con `tabIndex={0}` y `role="button"`, si no el elemento
 * sigue sin poder recibir foco.
 */
export function activarConTeclado(accion: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      accion();
    }
  };
}
