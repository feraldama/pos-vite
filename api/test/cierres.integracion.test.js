// Reporte detallado de cierres de caja: cada cierre se arma con la última
// apertura del mismo usuario y los movimientos entre ambos (misma cuenta que
// el PDF de cierre). Solo lo ve el administrador.
const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { pool, llamar, crearEntorno } = require("./entorno");
const C = require("../controllers/registrodiariocaja.controller");
const soloAdmin = require("../middlewares/soloAdmin");

const saltear = process.env.SKIP_DB_TESTS === "1";

describe("reporte de cierres de caja (integración)", { skip: saltear }, () => {
  let e;

  // Inserta un registro de caja del usuario del entorno; devuelve su id
  const registro = async (fecha, tipo, grupo, monto, detalle = "TEST") =>
    (
      await pool.query(
        `INSERT INTO registrodiariocaja ("CajaId", "RegistroDiarioCajaFecha", "TipoGastoId",
           "TipoGastoGrupoId", "RegistroDiarioCajaDetalle", "RegistroDiarioCajaMonto", "UsuarioId")
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING "RegistroDiarioCajaId"`,
        [e.cajaId, fecha, tipo, grupo, detalle, monto, e.usuarioId]
      )
    ).rows[0].RegistroDiarioCajaId;

  const cierres = async (query) =>
    llamar(C.getCierres, {
      query: { desde: "2040-01-01", hasta: "2040-01-31", ...query },
    });

  let ids = {};
  before(async () => {
    e = await crearEntorno();
    // Sesión 1 (2040-01-10): falta efectivo
    ids.apertura1 = await registro("2040-01-10", 2, 2, 100000, "APERTURA");
    await registro("2040-01-10", 2, 1, 50000, "Venta efectivo");
    await registro("2040-01-10", 2, 4, 30000, "Venta POS");
    await registro("2040-01-10", 2, 6, 20000, "Transferencia");
    await registro("2040-01-10", 1, 1, 10000, "Compra insumos");
    // Devolución por transferencia: egreso que no sale del cajón
    await registro("2040-01-10", 1, 6, 15000, "Devolución Venta #1 - Transferencia");
    ids.cierre1 = await registro("2040-01-10", 1, 2, 130000, "CIERRE");
    // Sesión 2 (2040-01-11): cuadra
    ids.apertura2 = await registro("2040-01-11", 2, 2, 50000, "APERTURA");
    await registro("2040-01-11", 2, 1, 25000, "Venta efectivo");
    ids.cierre2 = await registro("2040-01-11", 1, 2, 75000, "CIERRE");
    // Cierre sin apertura propia (el anterior ya cerró la sesión 2)
    ids.cierre3 = await registro("2040-01-12", 1, 2, 1000, "CIERRE");
    // Fuera del rango de fechas pedido
    ids.apertura4 = await registro("2040-02-01", 2, 2, 1, "APERTURA");
    ids.cierre4 = await registro("2040-02-01", 1, 2, 1, "CIERRE");
  });
  after(async () => {
    await e?.limpiar();
    await pool.end();
  });

  test("arma cada cierre con su apertura, totales por medio y faltante", async () => {
    const r = await cierres({ usuarioId: e.usuarioId });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const lista = r.body.data;
    assert.deepEqual(
      lista.map((c) => c.CierreId),
      [ids.cierre3, ids.cierre2, ids.cierre1],
      "solo los del rango, del más nuevo al más viejo"
    );

    const s1 = lista.find((c) => c.CierreId === ids.cierre1);
    assert.equal(s1.AperturaId, ids.apertura1);
    assert.equal(s1.Fecha, "2040-01-10");
    assert.equal(s1.UsuarioId, e.usuarioId);
    assert.equal(s1.CajaId, e.cajaId);
    assert.ok(s1.CajaDescripcion.startsWith("TEST"));
    assert.equal(s1.Apertura, 100000);
    assert.equal(s1.Cierre, 130000);
    assert.equal(s1.IngresosEfectivo, 50000);
    assert.equal(s1.IngresosPOS, 30000);
    assert.equal(s1.IngresosTransfer, 20000);
    // Egresos en efectivo; la devolución por transferencia va aparte
    assert.equal(s1.Egresos, 10000);
    assert.equal(s1.EgresosTransfer, 15000);
    assert.equal(s1.IngresosVoucher, 0);
    // Efectivo esperado = apertura + ingresos en efectivo - egresos
    assert.equal(s1.EfectivoEsperado, 140000);
    // Diferencia = cierre - esperado: negativa es faltante
    assert.equal(s1.Diferencia, -10000);
    // Detalle: los movimientos entre apertura y cierre, sin ellos dos
    assert.deepEqual(
      s1.Movimientos.map((m) => [m.TipoGastoId, m.TipoGastoGrupoId, m.RegistroDiarioCajaMonto]),
      [
        [2, 1, 50000],
        [2, 4, 30000],
        [2, 6, 20000],
        [1, 1, 10000],
        [1, 6, 15000],
      ]
    );

    const s2 = lista.find((c) => c.CierreId === ids.cierre2);
    assert.equal(s2.AperturaId, ids.apertura2);
    assert.equal(s2.EfectivoEsperado, 75000);
    assert.equal(s2.Diferencia, 0);
    assert.equal(s2.Movimientos.length, 1);
  });

  test("un cierre sin apertura propia queda marcado y sin diferencia", async () => {
    const r = await cierres({ usuarioId: e.usuarioId });
    const s3 = r.body.data.find((c) => c.CierreId === ids.cierre3);
    assert.equal(s3.AperturaId, null);
    assert.equal(s3.Apertura, null);
    assert.equal(s3.Diferencia, null);
    assert.deepEqual(s3.Movimientos, []);
  });

  test("filtra por caja", async () => {
    let r = await cierres({ cajaId: String(e.cajaId) });
    assert.equal(r.body.data.length, 3);
    r = await cierres({ cajaId: String(e.cajaId), usuarioId: "no-existe" });
    assert.deepEqual(r.body.data, []);
  });

  test("exige fechas válidas", async () => {
    let r = await llamar(C.getCierres, { query: { hasta: "2040-01-31" } });
    assert.equal(r.status, 400);
    r = await llamar(C.getCierres, { query: { desde: "10/01/2040", hasta: "2040-01-31" } });
    assert.equal(r.status, 400);
  });

  test("mi último cierre: el del usuario logueado, sin ser admin", async () => {
    const r = await llamar(C.getMiUltimoCierre, {
      user: { id: e.usuarioId },
      // Un usuarioId en la query no cambia de quién es el cierre
      query: { usuarioId: "administrador" },
    });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.data.CierreId, ids.cierre4);
    assert.equal(r.body.data.AperturaId, ids.apertura4);
    assert.equal(r.body.data.UsuarioId, e.usuarioId);
    assert.equal(r.body.data.Diferencia, 0);
  });

  test("mi último cierre: 401 sin usuario y 404 si no tiene cierres", async () => {
    let r = await llamar(C.getMiUltimoCierre, {});
    assert.equal(r.status, 401);
    r = await llamar(C.getMiUltimoCierre, { user: { id: "no-existe-usuario" } });
    assert.equal(r.status, 404);
  });

  describe("soloAdmin", () => {
    const pasar = (usuarioId) =>
      new Promise((resolve) => {
        const res = {
          statusCode: 200,
          status(codigo) {
            this.statusCode = codigo;
            return this;
          },
          json(body) {
            resolve({ next: false, status: this.statusCode, body });
          },
        };
        soloAdmin({ user: usuarioId ? { id: usuarioId } : undefined }, res, (err) =>
          resolve({ next: true, err })
        );
      });

    test("rechaza a un usuario que no es administrador", async () => {
      const r = await pasar(e.usuarioId);
      assert.equal(r.next, false);
      assert.equal(r.status, 403);
    });

    test("rechaza sin usuario identificado", async () => {
      const r = await pasar(undefined);
      assert.equal(r.status, 401);
    });

    test("deja pasar al administrador", async () => {
      await pool.query(`UPDATE usuario SET "UsuarioIsAdmin" = 'S' WHERE "UsuarioId" = $1`, [
        e.usuarioId,
      ]);
      try {
        const r = await pasar(e.usuarioId);
        assert.equal(r.next, true);
        assert.equal(r.err, undefined);
      } finally {
        await pool.query(`UPDATE usuario SET "UsuarioIsAdmin" = 'N' WHERE "UsuarioId" = $1`, [
          e.usuarioId,
        ]);
      }
    });
  });
});
