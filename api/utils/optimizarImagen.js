const sharp = require("sharp");

// Mismo criterio que el cliente (client/src/utils/imagen.ts): las fotos de
// productos se guardan como JPEG de hasta 1600 px por lado. Alcanza para el
// zoom (la miniatura más grande es de 1200 px) y pesa cientos de KB en vez
// de varios MB.
const LADO_MAXIMO = 1600;
const CALIDAD = 85;

/**
 * Devuelve la imagen reducida y recomprimida, o la original si no se puede
 * procesar o si el resultado no es más liviano (p. ej. una foto ya chica).
 * Nunca falla: ante cualquier error conserva la original.
 */
async function optimizarImagen(original) {
  if (!original || !original.length) return original;
  try {
    const optimizada = await sharp(original)
      .rotate() // aplica la orientación EXIF de las fotos de celular
      .resize({
        width: LADO_MAXIMO,
        height: LADO_MAXIMO,
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "#ffffff" }) // PNG transparente -> fondo blanco
      .jpeg({ quality: CALIDAD, mozjpeg: true })
      .toBuffer();
    return optimizada.length < original.length ? optimizada : original;
  } catch {
    return original;
  }
}

module.exports = { optimizarImagen, LADO_MAXIMO };
