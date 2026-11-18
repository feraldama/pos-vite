// Lado mayor y calidad con que se guardan las fotos de productos. 1600 px
// alcanza de sobra para el zoom (la miniatura más grande es de 1200 px) y deja
// la foto en unos cientos de KB en vez de varios MB.
const LADO_MAXIMO = 1600;
const CALIDAD_JPEG = 0.85;

// Tope de lo que se puede mandar sin achicar: la API acepta 10 MB por
// pedido y el base64 pesa ~33% más que el archivo
export const TAMANO_MAXIMO_SIN_PROCESAR = 7 * 1024 * 1024;

const leerComoBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/**
 * Reduce la imagen a JPEG de hasta LADO_MAXIMO px por lado y la devuelve en
 * base64 (sin el prefijo "data:"). Respeta la orientación de las fotos de
 * celular y pone fondo blanco a los PNG transparentes.
 *
 * Si el navegador no puede decodificarla (p. ej. HEIC fuera de Safari),
 * manda el archivo original siempre que no supere el tope de la API; si lo
 * supera, lanza un error con un mensaje para mostrar al usuario.
 */
export async function prepararImagenParaSubir(archivo: File): Promise<string> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  } catch {
    if (archivo.size <= TAMANO_MAXIMO_SIN_PROCESAR) return leerComoBase64(archivo);
    throw new Error(
      "No se pudo procesar la imagen y es demasiado grande para subirla. Probá con una foto en JPG o PNG."
    );
  }

  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const ancho = Math.round(bitmap.width * escala);
  const alto = Math.round(bitmap.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return leerComoBase64(archivo);
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, ancho, alto);
  ctx.drawImage(bitmap, 0, 0, ancho, alto);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", CALIDAD_JPEG)
  );
  // Si por algún motivo el resultado no achica, se manda el original
  if (!blob || (blob.size >= archivo.size && archivo.size <= TAMANO_MAXIMO_SIN_PROCESAR)) {
    return leerComoBase64(archivo);
  }
  return leerComoBase64(blob);
}
