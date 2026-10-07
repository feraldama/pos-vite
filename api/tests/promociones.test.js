/**
 * Tests de las promociones configurables, contra la base `<DB_NAME>_test`.
 * Preparar la base:  node scripts/setup-test-db.cjs
 */
const test = require("node:test");
const assert = require("node:assert");

process.env.DB_NAME = `${process.env.DB_NAME || "decorpar"}_test`;

const pos = require("../controllers/pos.controller");
const promos = require("../controllers/promocion.controller");
const { inicioVentanaCumple, estadoCliente } = require("../utils/promociones");
const { pool } = require("../config/db");

const HOY = new Date().toISOString().slice(0, 10);
const SERVICIO = 1; // 50.000
const OTRO = 2; // 30.000

function llamar(handler, { body = {}, params = {}, query = {} } = {}) {
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
    handler({ body, params, query }, res);
  });
}

const uno = async (sql, params = []) => (await pool.query(sql, params)).rows[0];

async function nuevoCliente(nacimiento = null) {
  const r = await uno(
    `INSERT INTO clientes ("ClienteRUC","ClienteNombre","ClienteApellido","ClienteDireccion","ClienteTelefono","ClienteTipo","UsuarioId","ClienteFechaNacimiento")
     VALUES ('','CLIENTE','PROMO','','0981','MI','lavadero',$1) RETURNING "ClienteId"`,
    [nacimiento]
  );
  return r.ClienteId;
}

/** Venta al contado. items: [{ productoId, precio, promocionId? }] (una unidad c/u) */
function vender(clienteId, items) {
  const total = items.reduce((a, it) => a + it.precio, 0);
  return llamar(pos.confirmarVenta, {
    body: {
      fecha: HOY,
      clienteId,
      almacenId: 2,
      cajaId: 2,
      usuarioId: "lavadero",
      ventaTipo: "CO",
      total,
      pagos: { efectivo: total },
      items: items.map((it) => ({
        productoId: it.productoId,
        cantidad: 1,
        precio: it.precio,
        precioTotal: it.precio,
        unidad: "N",
        promocionId: it.promocionId,
      })),
    },
  });
}

async function crearPromo(body) {
  const r = await llamar(promos.create, { body });
  assert.strictEqual(r.status, 201, JSON.stringify(r.body));
  return r.body.data.PromocionId;
}

const estadoDe = async (clienteId, promocionId) =>
  (await estadoCliente(clienteId, HOY)).find((e) => e.PromocionId === promocionId);

test.after(() => pool.end());

test("ventana de cumpleaños: el día, antes/después, cambio de año y 29/02", () => {
  assert.strictEqual(inicioVentanaCumple("1990-10-07", "2026-10-07", 0, 0), "2026-10-07");
  assert.strictEqual(inicioVentanaCumple("1990-10-07", "2026-10-08", 0, 0), null);
  assert.strictEqual(inicioVentanaCumple("1990-10-07", "2026-10-04", 3, 0), "2026-10-04");
  assert.strictEqual(inicioVentanaCumple("1990-10-07", "2026-10-11", 0, 3), null);
  // cumple el 30/12 con 5 días después: el 03/01 sigue en la ventana del año anterior
  assert.strictEqual(inicioVentanaCumple("1985-12-30", "2027-01-03", 0, 5), "2026-12-30");
  // cumple el 02/01 con 3 días antes: el 31/12 ya está en la ventana del año siguiente
  assert.strictEqual(inicioVentanaCumple("1985-01-02", "2026-12-31", 3, 0), "2026-12-30");
  // 29/02 en año no bisiesto se festeja el 28/02
  assert.strictEqual(inicioVentanaCumple("2000-02-29", "2027-02-28", 0, 0), "2027-02-28");
  assert.strictEqual(inicioVentanaCumple("2000-02-29", "2028-02-29", 0, 0), "2028-02-29");
});

test("valida la configuración de la promoción", async () => {
  const sinServicios = await llamar(promos.create, {
    body: { PromocionNombre: "X", PromocionTipo: "FR", PromocionBeneficio: "R", PromocionCantidad: 4 },
  });
  assert.strictEqual(sinServicios.status, 400);
  const descuentoMalo = await llamar(promos.create, {
    body: { PromocionNombre: "X", PromocionTipo: "CU", PromocionBeneficio: "D", PromocionDescuento: 150 },
  });
  assert.strictEqual(descuentoMalo.status, 400);
});

test("cada 4 servicios el 5.º es gratis, y el conteo se reinicia", async () => {
  const promo = await crearPromo({
    PromocionNombre: "5to lavado gratis",
    PromocionTipo: "FR",
    PromocionBeneficio: "R",
    PromocionCantidad: 4,
    productosCuentan: [SERVICIO],
    productosBeneficio: [SERVICIO],
  });
  const cliente = await nuevoCliente();

  for (let i = 0; i < 3; i++) await vender(cliente, [{ productoId: SERVICIO, precio: 50000 }]);
  // un servicio que no cuenta
  await vender(cliente, [{ productoId: OTRO, precio: 30000 }]);
  let estado = await estadoDe(cliente, promo);
  assert.strictEqual(estado.progreso, 3);
  assert.strictEqual(estado.disponible, false);

  const antes = await vender(cliente, [{ productoId: SERVICIO, precio: 0, promocionId: promo }]);
  assert.strictEqual(antes.status, 400, "con 3 no corresponde todavía");

  await vender(cliente, [{ productoId: SERVICIO, precio: 50000 }]);
  estado = await estadoDe(cliente, promo);
  assert.strictEqual(estado.disponible, true);
  assert.strictEqual(estado.productosBeneficio[0].precio, 0);

  const otroProducto = await vender(cliente, [{ productoId: OTRO, precio: 0, promocionId: promo }]);
  assert.strictEqual(otroProducto.status, 400, "el regalo es solo de los productos configurados");
  const precioMal = await vender(cliente, [{ productoId: SERVICIO, precio: 10000, promocionId: promo }]);
  assert.strictEqual(precioMal.status, 400, "el regalo va a Gs. 0");

  const gratis = await vender(cliente, [{ productoId: SERVICIO, precio: 0, promocionId: promo }]);
  assert.strictEqual(gratis.status, 201, JSON.stringify(gratis.body));
  const uso = await uno(`SELECT * FROM ventapromocion WHERE "VentaId" = $1`, [gratis.body.ventaId]);
  assert.strictEqual(Number(uso.VentaPromocionDescuento), 50000);

  estado = await estadoDe(cliente, promo);
  assert.strictEqual(estado.progreso, 0, "el conteo arranca de nuevo");
  assert.strictEqual(estado.disponible, false);

  // Anular la venta del regalo le devuelve el beneficio
  await llamar(pos.anularVenta, { body: { id: gratis.body.ventaId } });
  estado = await estadoDe(cliente, promo);
  assert.strictEqual(estado.disponible, true);

  const borrar = await llamar(promos.remove, { params: { id: promo } });
  assert.strictEqual(borrar.status, 200, "sin usos se puede eliminar");
});

test("una promoción con usos no se elimina", async () => {
  const promo = await crearPromo({
    PromocionNombre: "Cada 1",
    PromocionTipo: "FR",
    PromocionBeneficio: "R",
    PromocionCantidad: 1,
    productosCuentan: [OTRO],
  });
  const cliente = await nuevoCliente();
  await vender(cliente, [{ productoId: OTRO, precio: 30000 }]);
  // sin productos de beneficio: vale para cualquier producto
  const r = await vender(cliente, [{ productoId: SERVICIO, precio: 0, promocionId: promo }]);
  assert.strictEqual(r.status, 201, JSON.stringify(r.body));
  const borrar = await llamar(promos.remove, { params: { id: promo } });
  assert.strictEqual(borrar.status, 409);
  await llamar(promos.update, {
    params: { id: promo },
    body: { PromocionNombre: "Cada 1", PromocionTipo: "FR", PromocionBeneficio: "R", PromocionCantidad: 1, productosCuentan: [OTRO], PromocionActiva: 0 },
  });
});

test("cumpleaños con descuento: una vez por cumpleaños y solo con fecha cargada", async () => {
  const promo = await crearPromo({
    PromocionNombre: "Cumple 20%",
    PromocionTipo: "CU",
    PromocionBeneficio: "D",
    PromocionDescuento: 20,
    PromocionDiasAntes: 0,
    PromocionDiasDespues: 7,
  });
  const cumpleHoy = await nuevoCliente(`1990-${HOY.slice(5)}`);
  const sinFecha = await nuevoCliente(null);

  const estado = await estadoDe(cumpleHoy, promo);
  assert.strictEqual(estado.disponible, true);
  assert.deepStrictEqual(estado.productosBeneficio, [], "sin productos: cualquier producto");

  const malPrecio = await vender(cumpleHoy, [{ productoId: SERVICIO, precio: 50000, promocionId: promo }]);
  assert.strictEqual(malPrecio.status, 400);
  const ok = await vender(cumpleHoy, [
    { productoId: SERVICIO, precio: 40000, promocionId: promo },
    { productoId: OTRO, precio: 30000 },
  ]);
  assert.strictEqual(ok.status, 201, JSON.stringify(ok.body));

  const repetir = await vender(cumpleHoy, [{ productoId: OTRO, precio: 24000, promocionId: promo }]);
  assert.strictEqual(repetir.status, 400, "ya lo usó en este cumpleaños");

  assert.strictEqual((await estadoDe(sinFecha, promo)).disponible, false);
  const sinNombre = await vender(1, [{ productoId: SERVICIO, precio: 40000, promocionId: promo }]);
  assert.strictEqual(sinNombre.status, 400, "el cliente genérico no recibe promociones");

  const usos = await llamar(promos.reporteUsos, { query: { desde: HOY, hasta: HOY } });
  assert.ok(usos.body.data.some((u) => u.VentaId === ok.body.ventaId && u.Descuento === 10000));

  const mes = Number(HOY.slice(5, 7));
  const cumples = await llamar(promos.reporteCumpleanos, { query: { mes } });
  assert.ok(cumples.body.data.some((c) => c.ClienteId === cumpleHoy && c.ClienteFechaNacimiento === `1990-${HOY.slice(5)}`));
});
