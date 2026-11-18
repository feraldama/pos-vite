import api from "./api";

// La API sirve la foto reducida al ancho pedido (96, 160, 320, 640 o 1200 px).
// Cada (producto, ancho) se descarga una sola vez mientras la app está
// abierta; el endpoint pide token, por eso se baja con axios y se usa una
// URL "blob:" en vez de poner la ruta directo en <img src>.
const cache = new Map<string, Promise<Blob | null>>();
const urls = new Map<string, string>();

const clave = (productoId: number, ancho: number) => `${productoId}:${ancho}`;

function descargar(productoId: number, ancho: number): Promise<Blob | null> {
  const k = clave(productoId, ancho);
  let pendiente = cache.get(k);
  if (!pendiente) {
    pendiente = api
      .get<Blob>(`/productos/${productoId}/imagen`, {
        params: { ancho },
        responseType: "blob",
      })
      .then((res) => res.data)
      .catch(() => {
        cache.delete(k); // permitir reintentar más adelante
        return null;
      });
    cache.set(k, pendiente);
  }
  return pendiente;
}

/** URL "blob:" de la imagen del producto, o null si no tiene / falló. */
export async function obtenerUrlImagenProducto(
  productoId: number,
  ancho = 320
): Promise<string | null> {
  const k = clave(productoId, ancho);
  const existente = urls.get(k);
  if (existente) return existente;
  const blob = await descargar(productoId, ancho);
  if (!blob) return null;
  const url = urls.get(k) ?? URL.createObjectURL(blob);
  urls.set(k, url);
  return url;
}

/** Data URL (base64) de la imagen, para jsPDF u otros que no aceptan blob:. */
export async function obtenerDataUrlImagenProducto(
  productoId: number,
  ancho = 320
): Promise<string | null> {
  const blob = await descargar(productoId, ancho);
  if (!blob) return null;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

// Versión de la foto de cada producto: sube al invalidarla, para que los
// componentes que ya la muestran en pantalla la vuelvan a pedir
const versiones = new Map<number, number>();
const oyentes = new Set<() => void>();

export function suscribirCambiosImagen(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

export const versionImagenProducto = (productoId: number) =>
  versiones.get(productoId) ?? 0;

/** Descarta la imagen guardada de un producto (p. ej. después de editarlo). */
export function invalidarImagenProducto(productoId: number) {
  for (const k of [...cache.keys()]) {
    if (k.startsWith(`${productoId}:`)) cache.delete(k);
  }
  for (const [k, url] of [...urls.entries()]) {
    if (k.startsWith(`${productoId}:`)) {
      URL.revokeObjectURL(url);
      urls.delete(k);
    }
  }
  versiones.set(productoId, versionImagenProducto(productoId) + 1);
  oyentes.forEach((oyente) => oyente());
}
