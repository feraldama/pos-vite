/**
 * Imagen por defecto para productos sin foto.
 *
 * Antes se reusaba el logo de la empresa (logo.jpg), lo que mostraba una marca
 * ajena en cada prenda sin imagen. Este SVG inline no pesa nada, no necesita un
 * request y sirve tanto en JSX como en los HTML que se arman por string.
 */
// width/height explícitos además del viewBox: dentro de un <img> un SVG sin
// dimensiones intrínsecas resuelve a 0 de ancho y no se dibuja.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
  <rect width="96" height="96" fill="#f1f5f9"/>
  <g stroke="#94a3b8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M48 24a5 5 0 1 1 5 5c-3 0-5 2-5 4.5V36"/>
    <path d="M48 36 24 52c-2.5 1.7-1.3 5.5 1.7 5.5h44.6c3 0 4.2-3.8 1.7-5.5L48 36Z"/>
    <path d="M33 62v8a4 4 0 0 0 4 4h22a4 4 0 0 0 4-4v-8"/>
  </g>
</svg>`;

export const PLACEHOLDER_PRENDA = `data:image/svg+xml,${encodeURIComponent(
  svg
)}`;

export default PLACEHOLDER_PRENDA;
