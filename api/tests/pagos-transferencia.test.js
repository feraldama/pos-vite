/**
 * Tests de los pagos por transferencia, contra la base `<DB_NAME>_test`.
 * Preparar la base:  node scripts/setup-test-db.cjs
 */
const test = require("node:test");
const assert = require("node:assert");

process.env.DB_NAME = `${process.env.DB_NAME || "decorpar"}_test`;

const pagos = require("../controllers/pagotransferencia.controller");
const { pool } = require("../config/db");

const HOY = new Date().toISOString().slice(0, 10);
const LAVADERO = { id: "lavadero", isAdmin: "N" };
const OTRO = { id: "otro", isAdmin: "N" };
const ADMIN = { id: "admin", isAdmin: "S" };
// PNG de 1x1
const PNG_1X1 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

/** Ejecuta un handler de Express con req/res simulados. */
function llamar(handler, { body = {}, params = {}, query = {}, user } = {}) {
  return new Promise((resolve) => {
    const headers = {};
    const res = {
      statusCode: 200,
      status(c) {
        this.statusCode = c;
        return this;
      },
      set(k, v) {
        headers[k] = v;
        return this;
      },
      json(payload) {
        resolve({ status: this.statusCode, body: payload });
      },
      send(payload) {
        resolve({ status: this.statusCode, body: payload, headers });
      },
    };
    handler({ body, params, query, user }, res);
  });
}

const PAGO = {
  PagoFecha: HOY,
  PagoMonto: 150000,
  PagoBeneficiario: "  Ferretería   Central ",
  PagoConcepto: "Mangueras y boquillas para el lavadero",
  TipoGastoGrupoId: 1,
  PagoCuentaOrigen: "Itaú cta. cte.",
  PagoNumeroOperacion: "123456",
};

async function crear(extra = {}, user = LAVADERO) {
  const r = await llamar(pagos.create, { body: { ...PAGO, ...extra }, user });
  assert.strictEqual(r.status, 201, JSON.stringify(r.body));
  return r.body.data.PagoTransferenciaId;
}

test.after(() => pool.end());

test("registra un pago con su comprobante y lo lista sin el archivo", async () => {
  const id = await crear({
    comprobante: { nombre: "transf.png", tipo: "image/png", base64: PNG_1X1 },
  });
  const lista = await llamar(pagos.getAll, {
    query: { desde: HOY, hasta: HOY },
    user: LAVADERO,
  });
  assert.strictEqual(lista.status, 200);
  const pago = lista.body.data.find((p) => p.PagoTransferenciaId === id);
  assert.ok(pago);
  assert.strictEqual(pago.PagoBeneficiario, "Ferretería Central");
  assert.strictEqual(pago.PagoMonto, 150000);
  assert.strictEqual(pago.TieneComprobante, true);
  assert.strictEqual(pago.TipoGastoGrupoDescripcion, "COMPRA");
  assert.strictEqual(pago.PagoComprobante, undefined);

  const archivo = await llamar(pagos.comprobante, { params: { id }, user: LAVADERO });
  assert.strictEqual(archivo.status, 200);
  assert.strictEqual(archivo.headers["Content-Type"], "image/png");
  assert.ok(Buffer.from(PNG_1X1, "base64").equals(archivo.body));
});

test("exige el detalle y rechaza montos, categorías y archivos inválidos", async () => {
  const casos = [
    [{ PagoConcepto: "  " }, /en qué se gastó/],
    [{ PagoBeneficiario: "" }, /a quién/],
    [{ PagoMonto: 0 }, /monto/],
    [{ PagoMonto: 10.5 }, /monto/],
    [{ TipoGastoGrupoId: 2 }, /categoría/], // cierre de caja no es una categoría
    [{ PagoFecha: "22/10/2026" }, /fecha/],
    [{ comprobante: { nombre: "x.exe", tipo: "application/x-msdownload", base64: "AAAA" } }, /imagen/],
  ];
  for (const [extra, mensaje] of casos) {
    const r = await llamar(pagos.create, { body: { ...PAGO, ...extra }, user: LAVADERO });
    assert.strictEqual(r.status, 400, JSON.stringify(extra));
    assert.match(r.body.message, mensaje);
  }
});

test("cada usuario ve y toca solo sus pagos; el administrador, todos", async () => {
  const id = await crear();

  const ajenos = await llamar(pagos.getAll, { query: { desde: HOY, hasta: HOY }, user: OTRO });
  assert.ok(!ajenos.body.data.some((p) => p.PagoTransferenciaId === id));

  for (const [handler, body] of [
    [pagos.update, PAGO],
    [pagos.remove, {}],
    [pagos.comprobante, {}],
  ]) {
    const r = await llamar(handler, { params: { id }, body, user: OTRO });
    assert.strictEqual(r.status, 404);
  }

  const todos = await llamar(pagos.getAll, { query: { desde: HOY, hasta: HOY }, user: ADMIN });
  assert.ok(todos.body.data.some((p) => p.PagoTransferenciaId === id));

  const editado = await llamar(pagos.update, {
    params: { id },
    body: { ...PAGO, PagoMonto: 175000 },
    user: ADMIN,
  });
  assert.strictEqual(editado.status, 200, JSON.stringify(editado.body));

  const borrado = await llamar(pagos.remove, { params: { id }, user: LAVADERO });
  assert.strictEqual(borrado.status, 200);
});

test("editar sin mandar el comprobante lo conserva; null lo quita", async () => {
  const id = await crear({
    comprobante: { nombre: "t.png", tipo: "image/png", base64: PNG_1X1 },
  });
  const tiene = async () =>
    (await pool.query(
      'SELECT "PagoComprobante" IS NOT NULL AS t FROM pagotransferencia WHERE "PagoTransferenciaId" = $1',
      [id]
    )).rows[0].t;

  await llamar(pagos.update, { params: { id }, body: { ...PAGO }, user: LAVADERO });
  assert.strictEqual(await tiene(), true);

  await llamar(pagos.update, { params: { id }, body: { ...PAGO, comprobante: null }, user: LAVADERO });
  assert.strictEqual(await tiene(), false);
});

test("el reporte trae los pagos de todos solo para quien puede ver reportes", async () => {
  const id = await crear();
  const rango = { desde: HOY, hasta: HOY };

  const negado = await llamar(pagos.reporte, { query: rango, user: LAVADERO });
  assert.strictEqual(negado.status, 403);

  const r = await llamar(pagos.reporte, { query: rango, user: ADMIN });
  assert.strictEqual(r.status, 200);
  assert.ok(r.body.data.some((p) => p.PagoTransferenciaId === id && p.UsuarioId === "lavadero"));

  const sug = await llamar(pagos.sugerencias, { user: LAVADERO });
  assert.ok(sug.body.data.beneficiarios.includes("Ferretería Central"));
  assert.ok(sug.body.data.cuentas.includes("Itaú cta. cte."));
});

test("los pagos no tocan la caja", async () => {
  const antes = (await pool.query('SELECT COUNT(*)::int n FROM registrodiariocaja')).rows[0].n;
  await crear();
  const despues = (await pool.query('SELECT COUNT(*)::int n FROM registrodiariocaja')).rows[0].n;
  assert.strictEqual(despues, antes);
});
