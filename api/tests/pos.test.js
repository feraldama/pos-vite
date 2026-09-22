/**
 * Tests de integración de los endpoints POS, contra la base `<DB_NAME>_test`.
 * Nunca tocan la base real.
 *
 * Preparar la base una vez:  node scripts/setup-test-db.cjs
 * Correr:                    node --test tests/
 *
 * Se llama directamente a los controladores con un req/res simulado: alcanza
 * para cubrir la lógica y evita levantar el servidor.
 */
const test = require("node:test");
const assert = require("node:assert");

// Tiene que quedar fijado antes de cargar db.js: dotenv no pisa lo ya definido.
process.env.DB_NAME = `${process.env.DB_NAME || "decorpar"}_test`;

const pos = require("../controllers/pos.controller");
const { pool } = require("../config/db");

const HOY = new Date().toISOString().slice(0, 10);
const PRODUCTO = 1;
const CLIENTE = 1;
const ALMACEN = 2;
const CAJA = 2;
const USUARIO = "lavadero";

/** Ejecuta un handler de Express con un res simulado. */
function llamar(handler, body) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      status(c) {
        this.statusCode = c;
        return this;
      },
      json(payload) {
        resolve({ status: this.statusCode, body: payload });
      },
    };
    handler({ body }, res);
  });
}

const uno = async (sql, params = []) => (await pool.query(sql, params)).rows[0];
const stock = async () =>
  Number((await uno('SELECT "ProductoStock" s FROM producto WHERE "ProductoId" = $1', [PRODUCTO])).s);
const caja = async () =>
  Number((await uno('SELECT "CajaMonto" m FROM caja WHERE "CajaId" = $1', [CAJA])).m);
const contar = async (tabla) =>
  Number((await uno(`SELECT COUNT(*) n FROM ${tabla}`)).n);

const ventaContado = (total = 50000, cantidad = 1) => ({
  fecha: HOY,
  clienteId: CLIENTE,
  almacenId: ALMACEN,
  cajaId: CAJA,
  usuarioId: USUARIO,
  ventaTipo: "CO",
  total,
  pagos: { efectivo: total },
  items: [{ productoId: PRODUCTO, cantidad, precio: total, precioTotal: total, unidad: "N" }],
});

test.after(() => pool.end());

test("una venta al contado graba la venta, descuenta stock y suma a la caja", async () => {
  const stock0 = await stock();
  const caja0 = await caja();

  const r = await llamar(pos.confirmarVenta, ventaContado(50000, 2));
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.success, true);

  const v = await uno('SELECT * FROM venta WHERE "VentaId" = $1', [r.body.ventaId]);
  assert.strictEqual(v.VentaTipo, "CO");
  assert.strictEqual(Number(v.Total), 50000);
  assert.strictEqual(Number(v.VentaEntrega), 50000, "al contado se entrega todo");

  assert.strictEqual(await stock(), stock0 - 2, "descuenta la cantidad vendida");
  assert.strictEqual(await caja(), caja0 + 50000, "el efectivo entra a la caja");

  const mov = await uno('SELECT * FROM registrodiariocaja WHERE "VentaId" = $1', [r.body.ventaId]);
  assert.strictEqual(mov.RegistroDiarioCajaDetalle, `Venta N°: ${r.body.ventaId}`);
  assert.strictEqual(mov.TipoGastoGrupoId, 1, "grupo VENTA");

  await llamar(pos.anularVenta, { id: r.body.ventaId });
});

test("rechaza la venta si los pagos no suman el total", async () => {
  const antes = await contar("venta");
  const r = await llamar(pos.confirmarVenta, {
    ...ventaContado(50000),
    pagos: { efectivo: 20000 },
  });
  assert.strictEqual(r.status, 400);
  assert.match(r.body.message, /pagos suman/i);
  assert.strictEqual(await contar("venta"), antes, "no debe quedar ninguna venta a medias");
});

test("rechaza la venta si el almacén no existe", async () => {
  const r = await llamar(pos.confirmarVenta, { ...ventaContado(), almacenId: 999 });
  assert.strictEqual(r.status, 400);
  assert.match(r.body.message, /almac[eé]n/i);
});

test("rechaza una venta sin productos", async () => {
  const r = await llamar(pos.confirmarVenta, { ...ventaContado(), items: [] });
  assert.strictEqual(r.status, 400);
});

test("una venta a crédito abre el crédito y asienta el anticipo como pago 1", async () => {
  const caja0 = await caja();
  const r = await llamar(pos.confirmarVenta, {
    ...ventaContado(50000),
    ventaTipo: "CR",
    pagos: { efectivo: 20000, cuentaCliente: 30000 },
  });
  assert.strictEqual(r.status, 201);
  const id = r.body.ventaId;

  const v = await uno('SELECT * FROM venta WHERE "VentaId" = $1', [id]);
  assert.strictEqual(Number(v.VentaEntrega), 20000, "solo se entregó el efectivo");

  const cred = await uno('SELECT * FROM ventacredito WHERE "VentaId" = $1', [id]);
  assert.strictEqual(cred.VentaCreditoPagoCant, 1, "el anticipo cuenta como pago 1");

  const pago = await uno('SELECT * FROM ventacreditopago WHERE "VentaCreditoId" = $1', [
    cred.VentaCreditoId,
  ]);
  assert.strictEqual(Number(pago.VentaCreditoPagoMonto), 20000);

  const mov = await uno('SELECT * FROM registrodiariocaja WHERE "VentaId" = $1', [id]);
  assert.strictEqual(mov.TipoGastoGrupoId, 3, "el efectivo de una venta CR va al grupo VENTA CREDITO");
  assert.strictEqual(await caja(), caja0 + 20000, "solo entra el efectivo, no el saldo a cuenta");

  await llamar(pos.anularVenta, { id });
});

test("exige coherencia entre el tipo de venta y el saldo a cuenta", async () => {
  const sinSaldo = await llamar(pos.confirmarVenta, { ...ventaContado(50000), ventaTipo: "CR" });
  assert.strictEqual(sinSaldo.status, 400);

  const conSaldo = await llamar(pos.confirmarVenta, {
    ...ventaContado(50000),
    ventaTipo: "CO",
    pagos: { efectivo: 20000, cuentaCliente: 30000 },
  });
  assert.strictEqual(conSaldo.status, 400);
});

test("el cobro de crédito imputa el saldo y lo registra en la caja", async () => {
  const venta = await llamar(pos.confirmarVenta, {
    ...ventaContado(50000),
    ventaTipo: "CR",
    pagos: { efectivo: 20000, cuentaCliente: 30000 },
  });
  const id = venta.body.ventaId;
  const caja0 = await caja();

  const deMas = await llamar(pos.cobrarCredito, {
    fecha: HOY,
    clienteId: CLIENTE,
    montoRecibido: 999999,
    cajaId: CAJA,
    usuarioId: USUARIO,
  });
  assert.strictEqual(deMas.status, 400, "no se puede cobrar más que la deuda");

  const r = await llamar(pos.cobrarCredito, {
    fecha: HOY,
    clienteId: CLIENTE,
    montoRecibido: 30000,
    cajaId: CAJA,
    usuarioId: USUARIO,
    ventaPagoTipo: "CO",
  });
  assert.strictEqual(r.status, 201);
  assert.deepStrictEqual(r.body.imputaciones, [{ ventaId: id, monto: 30000 }]);

  const v = await uno('SELECT * FROM venta WHERE "VentaId" = $1', [id]);
  assert.strictEqual(Number(v.VentaEntrega), 50000, "queda saldada");
  assert.strictEqual(await caja(), caja0 + 30000);

  const cred = await uno('SELECT * FROM ventacredito WHERE "VentaId" = $1', [id]);
  assert.strictEqual(cred.VentaCreditoPagoCant, 2, "anticipo + cobro");

  await llamar(pos.anularVenta, { id });
});

test("anular deja stock y caja como estaban, y borra todo el rastro", async () => {
  const stock0 = await stock();
  const caja0 = await caja();
  const movs0 = await contar("registrodiariocaja");

  const venta = await llamar(pos.confirmarVenta, {
    ...ventaContado(50000),
    ventaTipo: "CR",
    pagos: { efectivo: 20000, cuentaCliente: 30000 },
  });
  const id = venta.body.ventaId;
  await llamar(pos.cobrarCredito, {
    fecha: HOY,
    clienteId: CLIENTE,
    montoRecibido: 30000,
    cajaId: CAJA,
    usuarioId: USUARIO,
  });

  const r = await llamar(pos.anularVenta, { id });
  assert.strictEqual(r.status, 200);

  assert.strictEqual(await stock(), stock0, "el stock vuelve al valor previo");
  assert.strictEqual(await caja(), caja0, "la caja vuelve al saldo previo");
  assert.strictEqual(await contar("registrodiariocaja"), movs0, "no quedan movimientos sueltos");
  assert.strictEqual(
    await contar(`venta WHERE "VentaId" = ${id}`),
    0,
    "la venta se elimina en la misma operación"
  );
  assert.strictEqual(await contar("ventacredito"), 0);
  assert.strictEqual(await contar("ventacreditopago"), 0);
});

test("anular dos veces no repone el stock de nuevo", async () => {
  const stock0 = await stock();
  const venta = await llamar(pos.confirmarVenta, ventaContado(50000, 3));
  const id = venta.body.ventaId;

  const primera = await llamar(pos.anularVenta, { id });
  assert.strictEqual(primera.status, 200);
  assert.strictEqual(await stock(), stock0);

  const segunda = await llamar(pos.anularVenta, { id });
  assert.strictEqual(segunda.status, 404, "la segunda anulación se rechaza");
  assert.strictEqual(await stock(), stock0, "el stock no se infla");

  const tercera = await llamar(pos.anularVenta, { id });
  assert.strictEqual(tercera.status, 404);
  assert.strictEqual(await stock(), stock0);
});

test("anular no toca los movimientos históricos con el mismo texto", async () => {
  // La semilla incluye un movimiento viejo con detalle "Venta N°: 1" y
  // VentaId NULL. Anular una venta nueva no debe alcanzarlo.
  const historico = await uno('SELECT * FROM registrodiariocaja WHERE "RegistroDiarioCajaId" = 900');
  assert.ok(historico, "la semilla tiene que traer el movimiento histórico");

  const venta = await llamar(pos.confirmarVenta, ventaContado(50000));
  await llamar(pos.anularVenta, { id: venta.body.ventaId });

  const sigue = await uno('SELECT * FROM registrodiariocaja WHERE "RegistroDiarioCajaId" = 900');
  assert.ok(sigue, "el movimiento histórico debe seguir existiendo");
  assert.strictEqual(Number(sigue.RegistroDiarioCajaMonto), 77777, "y con su monto intacto");
});

test("no filtra detalles de la base en los mensajes de error", async () => {
  const r = await llamar(pos.confirmarVenta, { ...ventaContado(), clienteId: 999999 });
  assert.ok(r.status >= 400);
  assert.ok(
    !/llave for[aá]nea|constraint|relation|column/i.test(r.body.message),
    `el mensaje no debe exponer el esquema: ${r.body.message}`
  );
});
