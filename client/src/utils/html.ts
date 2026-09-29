/**
 * Escapa un texto para insertarlo en HTML armado a mano (p.ej. el `html` de
 * Swal). Sin esto, un nombre de producto o de cliente con `<`, `&` o comillas
 * rompe el aviso o inyecta HTML. Montos formateados, fechas e ids numéricos no
 * lo necesitan; cualquier texto cargado por usuarios o que venga del servidor sí.
 */
export function escaparHtml(valor: unknown): string {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
