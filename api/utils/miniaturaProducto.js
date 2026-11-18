const crypto = require("crypto");
const sharp = require("sharp");

// Anchos permitidos (px). Se redondea hacia arriba al más cercano para que
// cada producto tenga pocas variantes en caché.
const ANCHOS = [96, 160, 320, 640, 1200];
const ANCHO_POR_DEFECTO = 320;

// Las fotos originales pesan varios MB; las miniaturas generadas quedan en
// memoria (unos pocos KB c/u) y se invalidan al editar o borrar el producto.
const cache = new Map(); // `${id}:${ancho}` -> Promise<{ buffer, etag } | null>

function normalizarAncho(valor) {
  const pedido = parseInt(valor, 10);
  if (!pedido) return ANCHO_POR_DEFECTO;
  return ANCHOS.find((a) => a >= pedido) || ANCHOS[ANCHOS.length - 1];
}

async function generar(id, ancho, leerOriginal) {
  const original = await leerOriginal(id);
  if (!original) return null;

  let buffer;
  try {
    buffer = await sharp(original)
      .rotate() // respeta la orientación EXIF de fotos de celular
      .resize({ width: ancho, height: ancho, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" }) // PNG con transparencia -> fondo blanco
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
  } catch {
    // Formato que sharp no entiende: se sirve el original tal cual
    buffer = original;
  }
  const etag = `"${crypto.createHash("md5").update(buffer).digest("hex")}"`;
  return { buffer, etag };
}

/**
 * Devuelve { buffer, etag } con la imagen reducida a JPEG, o null si el
 * producto no tiene imagen. `leerOriginal(id)` trae el binario desde la BD.
 * Se guarda la promesa, así pedidos simultáneos de la misma miniatura
 * (p. ej. una grilla cargando) la generan una sola vez.
 */
function obtenerMiniatura(id, anchoPedido, leerOriginal) {
  const clave = `${id}:${normalizarAncho(anchoPedido)}`;
  let pendiente = cache.get(clave);
  if (!pendiente) {
    pendiente = generar(id, normalizarAncho(anchoPedido), leerOriginal);
    cache.set(clave, pendiente);
    // No cachear errores ni "sin imagen" (puede cargarse una después)
    pendiente.then(
      (r) => { if (!r) cache.delete(clave); },
      () => cache.delete(clave)
    );
  }
  return pendiente;
}

function invalidarMiniaturas(id) {
  for (const ancho of ANCHOS) cache.delete(`${id}:${ancho}`);
}

module.exports = { obtenerMiniatura, invalidarMiniaturas, normalizarAncho };
