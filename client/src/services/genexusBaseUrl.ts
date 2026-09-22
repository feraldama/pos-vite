// URL base de los web services GeneXus (confirmación de ventas, pagos de
// crédito y anulación de registros de caja).
//
// Prioridad, igual que en apiBaseUrl.ts:
//   1. VITE_APP_URL del .env (útil si GeneXus vive en otro host).
//   2. El mismo host desde el que se abrió la app.
//
// El puerto y el path del servlet vienen en VITE_APP_URL_GENEXUS
// (por ejemplo ":8080/DecorparPintureria/servlet/com.decorpar.").
//
// Sin esto, con VITE_APP_URL fijo en http://localhost, el POS abierto desde
// otra máquina (http://<ip-del-servidor>:5173) apuntaba al localhost del
// cliente y la request moría sin llegar al servidor.
const GENEXUS_PATH = import.meta.env.VITE_APP_URL_GENEXUS || "";

function resolveGenexusHost(): string {
  const fromEnv = import.meta.env.VITE_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}`;
}

export const GENEXUS_BASE_URL = resolveGenexusHost() + GENEXUS_PATH;

/** Devuelve la URL completa de un servlet GeneXus. */
export const genexusUrl = (servlet: string) => `${GENEXUS_BASE_URL}${servlet}`;
