// Tests contra la base: fotos de productos (miniaturas, achicado al guardar
// y listados sin la foto). Usan los datos propios de crearEntorno y los
// borran al final.
const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");

const { pool, llamar, crearEntorno } = require("./entorno");
const PC = require("../controllers/producto.controller");

const saltear = process.env.SKIP_DB_TESTS === "1";

// Llama a getProductoImagen y junta status, headers y cuerpo
function pedirImagen(id, { ancho, etag } = {}) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      headers: {},
      set(h) {
        Object.assign(this.headers, h);
        return this;
      },
      status(c) {
        this.statusCode = c;
        return this;
      },
      send(cuerpo) {
        resolve({ status: this.statusCode, headers: this.headers, cuerpo });
      },
      end() {
        resolve({ status: this.statusCode, headers: this.headers });
      },
      json(cuerpo) {
        resolve({ status: this.statusCode, headers: this.headers, cuerpo });
      },
    };
    PC.getProductoImagen(
      {
        params: { id: String(id) },
        query: ancho ? { ancho: String(ancho) } : {},
        headers: etag ? { "if-none-match": etag } : {},
      },
      res
    );
  });
}

const imagenDePrueba = (color, ancho = 2000, alto = 1000) =>
  sharp({ create: { width: ancho, height: alto, channels: 3, background: color } })
    .png()
    .toBuffer();

describe("fotos de productos (integración)", { skip: saltear }, () => {
  let e;
  before(async () => {
    e = await crearEntorno({ stock: 2 });
  });
  after(async () => {
    await e?.limpiar();
    await pool.end();
  });

  test("producto sin imagen: 404", async () => {
    const r = await pedirImagen(e.productoId);
    assert.equal(r.status, 404);
  });

  test("devuelve JPEG reducido al ancho pedido, con ETag y 304", async () => {
    await pool.query(
      `UPDATE producto SET "ProductoImagen" = $1 WHERE "ProductoId" = $2`,
      [await imagenDePrueba("#ff0000"), e.productoId]
    );

    const r = await pedirImagen(e.productoId, { ancho: 160 });
    assert.equal(r.status, 200);
    assert.equal(r.headers["Content-Type"], "image/jpeg");
    assert.equal(r.headers["Cache-Control"], "private, no-cache");
    const meta = await sharp(r.cuerpo).metadata();
    assert.equal(meta.format, "jpeg");
    assert.equal(meta.width, 160); // 2000x1000 -> 160x80
    assert.equal(meta.height, 80);

    const otra = await pedirImagen(e.productoId, {
      ancho: 160,
      etag: r.headers.ETag,
    });
    assert.equal(otra.status, 304);
    assert.equal(otra.cuerpo, undefined);
  });

  test("al editar la foto se descarta la miniatura vieja", async () => {
    const antes = await pedirImagen(e.productoId, { ancho: 160 });
    const nueva = (await imagenDePrueba("#0000ff", 800, 800)).toString("base64");

    const r = await llamar(PC.updateProducto, {
      params: { id: String(e.productoId) },
      body: { ProductoNombre: "TEST FOTO NUEVA", ProductoImagen: nueva },
    });
    assert.equal(r.status, 200, JSON.stringify(r.body));

    const despues = await pedirImagen(e.productoId, { ancho: 160 });
    assert.equal(despues.status, 200);
    assert.notEqual(despues.headers.ETag, antes.headers.ETag);
    const meta = await sharp(despues.cuerpo).metadata();
    assert.equal(meta.width, 160);
    assert.equal(meta.height, 160);
  });

  test("editar sin mandar ProductoImagen conserva la foto", async () => {
    const antes = await pedirImagen(e.productoId, { ancho: 96 });
    const r = await llamar(PC.updateProducto, {
      params: { id: String(e.productoId) },
      body: { ProductoNombre: "TEST SIN TOCAR FOTO" },
    });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const despues = await pedirImagen(e.productoId, { ancho: 96 });
    assert.equal(despues.status, 200);
    assert.equal(despues.headers.ETag, antes.headers.ETag);
  });

  test("al guardar, la API achica la foto a JPEG de hasta 1600 px", async () => {
    const grande = (await imagenDePrueba("#00aa00", 3200, 2400)).toString("base64");
    const r = await llamar(PC.updateProducto, {
      params: { id: String(e.productoId) },
      body: { ProductoNombre: "TEST FOTO GRANDE", ProductoImagen: grande },
    });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal("ProductoImagen" in r.body.data, false);

    const { rows } = await pool.query(
      `SELECT "ProductoImagen" FROM producto WHERE "ProductoId" = $1`,
      [e.productoId]
    );
    const meta = await sharp(rows[0].ProductoImagen).metadata();
    assert.equal(meta.format, "jpeg");
    assert.equal(meta.width, 1600);
    assert.equal(meta.height, 1200);
  });

  test("los listados de productos no traen la foto, solo TieneImagen", async () => {
    const r = await llamar(PC.getProductoById, {
      params: { id: String(e.productoId) },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.TieneImagen, true);
    assert.equal("ProductoImagen" in r.body, false);
  });
});
