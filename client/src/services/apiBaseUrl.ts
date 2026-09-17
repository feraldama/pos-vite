// URL base del backend.
// Prioridad:
//   1. VITE_API_URL del .env (útil para apuntar a un backend en otro host).
//   2. El mismo host desde el que se abrió la app + el puerto del backend.
// Así la app funciona igual en http://localhost:5173 y en
// http://181.123.61.216:5173 sin tener que editar el .env ni rebuildear.
const API_PORT = import.meta.env.VITE_API_PORT || "3001";

function resolveApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:${API_PORT}/api`;
}

export const API_BASE_URL = resolveApiBaseUrl();
