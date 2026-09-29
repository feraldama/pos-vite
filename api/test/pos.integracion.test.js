// Tests de integración de la venta del POS (voucher como descuento).
// Correr con `npm test`. Con SKIP_DB_TESTS=1 se saltean.
const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { pool, llamar, crearEntorno } = require("./entorno");
const Pos = require("../controllers/pos.controller");

describe("venta del POS (integración)", { skip: process.env.SKIP_DB_TESTS === "1" }, () => {
  let e;
  let almacenId;
  before(async () => {
    e = await crearEntorno({ stock: 10 });
    almacenId = (await pool.query(`SELECT "AlmacenId" FROM almacen ORDER BY 1 LIMIT 1`)).rows[0]
      .AlmacenId;
  });
  after(async () => {
    await e?.limpiar();
    await pool.end();
  });

  const vender = (extra) =>
    llamar(Pos.confirmarVenta, {
      body: {
        fecha: "2040-01-01",
        clienteId: e.clienteId,
        almacenId,
        cajaId: e.cajaId,
        usuarioId: e.usuarioId,
        total: 100000,
        items: [{ productoId: e.productoId, cantidad: 1, precio: 100000, precioTotal: 100000 }],
        ...extra,
      },
    });
  const ventaDe = async (id) =>
    (
      await pool.query(
        `SELECT "Total", "VentaEntrega", "VentaDescuento" FROM venta WHERE "VentaId" = $1`,
        [id]
      )
    ).rows[0];

  test("con voucher: guarda el descuento y la caja registra solo lo cobrado", async () => {
    const r = await vender({ descuento: 30000, pagos: { efectivo: 70000 } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const id = r.body.ventaId;
    const v = await ventaDe(id);
    assert.deepEqual([v.Total, v.VentaEntrega, v.VentaDescuento], [100000, 70000, 30000]);

    const caja = await pool.query(
      `SELECT "RegistroDiarioCajaMonto" m FROM registrodiariocaja
       WHERE "CajaId" = $1 AND "RegistroDiarioCajaDetalle" LIKE $2`,
      [e.cajaId, `Venta #${id} -%`]
    );
    assert.deepEqual(caja.rows.map((x) => Number(x.m)), [70000]);
  });

  test("sin voucher: todo igual que antes (entrega = total, descuento 0)", async () => {
    const r = await vender({ pagos: { efectivo: 100000 } });
    const v = await ventaDe(r.body.ventaId);
    assert.deepEqual([v.VentaEntrega, v.VentaDescuento], [100000, 0]);
  });

  test("descuento negativo o mayor que el total: 400", async () => {
    for (const descuento of [-1, 100001, "abc"]) {
      const r = await vender({ descuento, pagos: { efectivo: 1 } });
      assert.equal(r.status, 400, String(descuento));
    }
  });
});
