// La devolución por transferencia del POS no sale del cajón: se guarda como
// egreso del grupo 6 (DEVOLUCIÓN TRANSFER) y el cierre no la resta del
// efectivo. La migración 2026-11-21_devolucion_transfer reclasifica las que
// ya estaban guardadas como DEVOLUCIÓN (grupo 5).
const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { pool, llamar, crearEntorno } = require("./entorno");
const Pos = require("../controllers/pos.controller");

const MIGRACION = path.join(__dirname, "../db/migrations/2026-11-21_devolucion_transfer.sql");

describe("devolución por transferencia (integración)", { skip: process.env.SKIP_DB_TESTS === "1" }, () => {
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

  const movimientosDe = async (detalle) =>
    (
      await pool.query(
        `SELECT "TipoGastoId" t, "TipoGastoGrupoId" g, "RegistroDiarioCajaMonto" m
         FROM registrodiariocaja WHERE "CajaId" = $1 AND "RegistroDiarioCajaDetalle" LIKE $2
         ORDER BY "RegistroDiarioCajaId"`,
        [e.cajaId, detalle]
      )
    ).rows.map((r) => [r.t, r.g, Number(r.m)]);

  test("el POS guarda la parte en efectivo en DEVOLUCIÓN y la transferencia en DEVOLUCIÓN TRANSFER", async () => {
    const r = await llamar(Pos.confirmarDevolucion, {
      body: {
        fecha: "2040-01-01",
        clienteId: e.clienteId,
        almacenId,
        cajaId: e.cajaId,
        usuarioId: e.usuarioId,
        total: 50000,
        pagos: { efectivo: 30000, transferencia: 20000 },
        items: [{ productoId: e.productoId, cantidad: 1, precio: 50000, precioTotal: 50000 }],
      },
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.deepEqual(await movimientosDe(`Devolución Venta #${r.body.ventaId} - %`), [
      [1, 5, 30000],
      [1, 6, 20000],
    ]);
  });

  test("la migración pasa al grupo 6 solo las devoluciones por transferencia ya guardadas", async () => {
    const insertar = (detalle) =>
      pool.query(
        `INSERT INTO registrodiariocaja ("CajaId", "RegistroDiarioCajaFecha", "TipoGastoId",
           "TipoGastoGrupoId", "RegistroDiarioCajaDetalle", "RegistroDiarioCajaMonto", "UsuarioId")
         VALUES ($1, '2040-01-02', 1, 5, $2, 1000, $3)`,
        [e.cajaId, detalle, e.usuarioId]
      );
    await insertar("Devolución Venta #987654 - Transferencia");
    await insertar("Devolución Venta #987654 - Efectivo");
    await insertar("Devolución manual Transferencia");

    // Volver a correrla no rompe nada (el grupo ya existe)
    await pool.query(fs.readFileSync(MIGRACION, "utf8"));

    assert.deepEqual(await movimientosDe("Devolución Venta #987654 - %"), [
      [1, 6, 1000],
      [1, 5, 1000],
    ]);
    assert.deepEqual(await movimientosDe("Devolución manual%"), [[1, 5, 1000]]);
    const grupo = await pool.query(
      `SELECT "TipoGastoGrupoDescripcion" d FROM tipogastogrupo
       WHERE "TipoGastoId" = 1 AND "TipoGastoGrupoId" = 6`
    );
    assert.equal(grupo.rows[0].d, "DEVOLUCIÓN TRANSFER");
  });

  test("migración del contador: no queda por debajo del máximo grupo de cada tipo", async () => {
    await pool.query(
      fs.readFileSync(path.join(__dirname, "../db/migrations/2026-11-21_tipogasto_contador.sql"), "utf8")
    );
    const { rows } = await pool.query(
      `SELECT t."TipoGastoId", t."TipoGastoCantGastos" c, MAX(g."TipoGastoGrupoId") m
       FROM tipogasto t JOIN tipogastogrupo g ON g."TipoGastoId" = t."TipoGastoId"
       GROUP BY 1, 2`
    );
    for (const r of rows) assert.ok(Number(r.c) >= Number(r.m), JSON.stringify(r));
  });
});

