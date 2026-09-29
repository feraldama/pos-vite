// Tests de integración de alquileres contra PostgreSQL (ver test/entorno.js).
// Correr con `npm test`. Con SKIP_DB_TESTS=1 se saltean.
const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { pool, llamar, crearEntorno } = require("./entorno");
const { translateQuery } = require("../config/db");
const C = require("../controllers/alquiler.controller");
const Alquiler = require("../models/alquiler.model");
const verificarPermiso = require("../middlewares/permiso");

const saltear = process.env.SKIP_DB_TESTS === "1";

const alquilerDe = async (id) =>
  (await llamar(C.getAlquilerById, { params: { id: String(id) } })).body;
const crear = async (body) => {
  const r = await llamar(C.createAlquiler, { body });
  return { ...r, id: r.body.data?.AlquilerId };
};

describe("alquileres (integración)", { skip: saltear }, () => {
  let e;
  before(async () => {
    e = await crearEntorno({ stock: 2 });
  });
  after(async () => {
    await e?.limpiar();
    await pool.end();
  });

  describe("crear", () => {
    test("guarda entrega base, descuento, caja con recargo y lo aplicado", async () => {
      const r = await crear(
        e.alquiler({
          AlquilerTotal: 300000,
          // Un cliente viejo mandaba la entrega con el recargo: se ignora
          AlquilerEntrega: 999999,
          pagos: { efectivo: 50000, tarjetaDebito: 100000, voucher: 30000 },
          CajaId: e.cajaId,
          UsuarioId: e.usuarioId,
        })
      );
      assert.equal(r.status, 201);
      const a = await alquilerDe(r.id);
      assert.equal(a.AlquilerEntrega, 150000);
      assert.equal(a.AlquilerDescuento, 30000);
      assert.equal(a.prendas.length, 1);

      const caja = await pool.query(
        `SELECT "RegistroDiarioCajaMonto" m FROM registrodiariocaja
         WHERE "CajaId" = $1 AND "RegistroDiarioCajaDetalle" LIKE $2 ORDER BY 1`,
        [e.cajaId, `Alquiler #${r.id} -%`]
      );
      assert.deepEqual(caja.rows.map((x) => Number(x.m)), [50000, 103000]);

      const aplicado = await pool.query(
        `SELECT SUM("AlquilerPagoMonto") s FROM alquilerpago WHERE "AlquilerId" = $1`,
        [r.id]
      );
      assert.equal(Number(aplicado.rows[0].s), 150000);
    });

    test("si falla el registro en caja no queda el alquiler", async () => {
      const antes = await pool.query(
        `SELECT COUNT(*) FROM alquiler WHERE "ClienteId" = $1`,
        [e.clienteId]
      );
      const r = await crear(
        e.alquiler({
          AlquilerFechaEntrega: "2040-06-05",
          AlquilerFechaDevolucion: "2040-06-08",
          pagos: { efectivo: 1000 },
          CajaId: e.cajaId,
          UsuarioId: "usuario_inexistente", // viola la FK de registrodiariocaja
        })
      );
      assert.equal(r.status, 500);
      const despues = await pool.query(
        `SELECT COUNT(*) FROM alquiler WHERE "ClienteId" = $1`,
        [e.clienteId]
      );
      assert.equal(despues.rows[0].count, antes.rows[0].count);
    });

    test("rechaza montos inválidos", async () => {
      for (const extra of [
        { AlquilerTotal: -1 },
        { AlquilerTotal: 100, pagos: { voucher: 500 } },
        { prendas: [{ ProductoId: e.productoId, AlquilerPrendasPrecio: -1 }] },
      ]) {
        const r = await crear(e.alquiler(extra));
        assert.equal(r.status, 400, JSON.stringify(extra));
      }
    });

    test("el bloqueo hace esperar al segundo, que ve lo que confirmó el primero", async () => {
      const { bloquearYValidarStock, StockError } = C._internos;
      const e3 = await crearEntorno({ stock: 1 });
      const a = await pool.connect();
      const b = await pool.connect();
      const conQ = (c) => (sql, params = []) => c.query(translateQuery(sql), params);
      a.q = conQ(a);
      b.q = conQ(b);
      const f = ["2044-01-05", "2044-01-08"];
      const prendas = [{ ProductoId: e3.productoId }];
      try {
        await a.query("BEGIN");
        await b.query("BEGIN");
        // A valida y deja su alquiler insertado, sin confirmar
        await bloquearYValidarStock(a, prendas, ...f);
        const { rows } = await a.q(
          `INSERT INTO alquiler (ClienteId, AlquilerFechaAlquiler, AlquilerFechaEntrega, AlquilerFechaDevolucion, AlquilerEstado)
           VALUES (?, ?, ?, ?, 'Pendiente') RETURNING AlquilerId`,
          [e3.clienteId, "2044-01-01", ...f]
        );
        await a.q(
          "INSERT INTO alquilerprendas (AlquilerId, AlquilerPrendasId, ProductoId) VALUES (?, 1, ?)",
          [rows[0].AlquilerId, e3.productoId]
        );

        // B pide la misma unidad: tiene que quedar esperando el bloqueo de A
        let terminoB = false;
        const resultadoB = bloquearYValidarStock(b, prendas, ...f)
          .then(() => "sin error", (err) => err)
          .finally(() => {
            terminoB = true;
          });
        await new Promise((r) => setTimeout(r, 300));
        assert.equal(terminoB, false, "B no esperó el bloqueo de A");

        // Al confirmar A, B sigue y ve la unidad ocupada
        await a.query("COMMIT");
        assert.ok((await resultadoB) instanceof StockError, "B no vio el alquiler de A");
      } finally {
        await a.query("ROLLBACK").catch(() => {});
        await b.query("ROLLBACK").catch(() => {});
        a.release();
        b.release();
        await e3.limpiar();
      }
    });

    test("con stock 2, de 5 alquileres simultáneos pasan exactamente 2", async () => {
      const fechas = {
        AlquilerFechaEntrega: "2041-01-05",
        AlquilerFechaDevolucion: "2041-01-08",
      };
      const rs = await Promise.all(
        Array.from({ length: 5 }, () => crear(e.alquiler(fechas)))
      );
      assert.equal(rs.filter((r) => r.status === 201).length, 2);
      const rechazo = rs.find((r) => r.status === 400);
      assert.equal(rechazo.body.prendasNoDisponibles[0].stockRealDisponible, 0);
      assert.equal(rechazo.body.prendasNoDisponibles[0].conflictos.length, 2);
    });
  });

  describe("editar", () => {
    const fechas = {
      AlquilerFechaEntrega: "2042-01-05",
      AlquilerFechaDevolucion: "2042-01-08",
    };
    let id;
    before(async () => {
      // Ocupa las 2 unidades: 1 en este alquiler y 1 en otro
      id = (await crear(e.alquiler({ ...fechas, pagos: { efectivo: 20000 } }))).id;
      await crear(e.alquiler(fechas));
    });

    test("sus propias prendas no cuentan como ocupadas", async () => {
      const r = await llamar(C.updateAlquiler, {
        params: { id: String(id) },
        body: e.alquiler({
          ...fechas,
          prendas: [
            { ProductoId: e.productoId, AlquilerPrendasPrecio: 100000, AlquilerPrendasObservacion: "ruedo" },
          ],
        }),
      });
      assert.equal(r.status, 200);
    });

    test("conserva entrega y estado si no se envían", async () => {
      // Pago registrado mientras se editaba
      await pool.query(`UPDATE alquiler SET "AlquilerEntrega" = 70000 WHERE "AlquilerId" = $1`, [id]);
      await llamar(C.updateAlquiler, { params: { id: String(id) }, body: e.alquiler(fechas) });
      const a = await alquilerDe(id);
      assert.equal(a.AlquilerEntrega, 70000);
      assert.equal(a.AlquilerEstado, "Pendiente");
    });

    test("sin stock para otra unidad: 400 y el alquiler queda como estaba", async () => {
      const r = await llamar(C.updateAlquiler, {
        params: { id: String(id) },
        body: e.alquiler({
          ...fechas,
          AlquilerTotal: 200000,
          prendas: [
            { ProductoId: e.productoId, AlquilerPrendasPrecio: 100000 },
            { ProductoId: e.productoId, AlquilerPrendasPrecio: 100000 },
          ],
        }),
      });
      assert.equal(r.status, 400);
      const a = await alquilerDe(id);
      assert.equal(a.prendas.length, 1);
      assert.equal(a.AlquilerTotal, 100000);
    });

    test("PATCH de estado: valida el valor y solo cambia el estado", async () => {
      const malo = await llamar(C.updateEstadoAlquiler, {
        params: { id: String(id) },
        body: { AlquilerEstado: "Otro" },
      });
      assert.equal(malo.status, 400);
      const ok = await llamar(C.updateEstadoAlquiler, {
        params: { id: String(id) },
        body: { AlquilerEstado: "Entregado" },
      });
      assert.equal(ok.status, 200);
      const a = await alquilerDe(id);
      assert.equal(a.AlquilerEstado, "Entregado");
      assert.equal(a.AlquilerEntrega, 70000);
    });
  });

  describe("cobro de saldos y reporte", () => {
    let e2;
    let a1;
    let a2;
    before(async () => {
      // Entorno aparte: el cobro reparte entre todos los alquileres del cliente
      e2 = await crearEntorno({ stock: 5 });
      a1 = (
        await crear(
          e2.alquiler({
            AlquilerFechaAlquiler: "2043-01-01",
            AlquilerTotal: 300000,
            pagos: { efectivo: 50000, tarjetaCredito: 100000 },
            CajaId: e2.cajaId,
            UsuarioId: e2.usuarioId,
          })
        )
      ).id;
      a2 = (
        await crear(e2.alquiler({ AlquilerFechaAlquiler: "2043-01-02", AlquilerTotal: 200000 }))
      ).id;
    });
    after(() => e2?.limpiar());

    test("reparte desde el más antiguo sin cambiar el estado", async () => {
      const r = await llamar(C.procesarPagoAlquileres, {
        body: {
          clienteId: e2.clienteId,
          montoPago: 250000,
          tipoPago: "EF",
          fecha: "2043-01-03",
          cajaId: e2.cajaId,
          usuarioId: e2.usuarioId,
        },
      });
      assert.equal(r.status, 200);
      assert.deepEqual(
        r.body.data.actualizaciones.map((x) => [x.AlquilerId, x.montoAplicado]),
        [
          [a1, 150000],
          [a2, 100000],
        ]
      );
      assert.equal((await alquilerDe(a1)).AlquilerEstado, "Pendiente");
    });

    test("el reporte muestra lo aplicado a cada uno y no mezcla movimientos ajenos", async () => {
      // Movimientos que no son pagos de a1: una venta con el mismo número y
      // un alquiler cuyo número empieza igual
      for (const detalle of [`Venta #${a1} - Efectivo`, `Alquiler #${a1}0 - Efectivo`]) {
        await pool.query(
          `INSERT INTO registrodiariocaja ("CajaId", "RegistroDiarioCajaFecha", "TipoGastoId", "TipoGastoGrupoId", "RegistroDiarioCajaDetalle", "RegistroDiarioCajaMonto", "UsuarioId")
           VALUES ($1, '2043-01-04', 2, 1, $2, 9999, $3)`,
          [e2.cajaId, detalle, e2.usuarioId]
        );
      }
      const pagos = await Alquiler.getPagosReporte([a1, a2]);
      assert.deepEqual(
        pagos.get(a1).map((p) => p.RegistroDiarioCajaMonto).sort((x, y) => x - y),
        [50000, 100000, 150000]
      );
      assert.deepEqual(pagos.get(a2).map((p) => p.RegistroDiarioCajaMonto), [100000]);
    });

    test("monto no numérico, fecha inválida o mayor que la deuda: 400", async () => {
      // Tras el cobro compartido, la deuda del cliente es 100.000 (de a2)
      for (const body of [
        { clienteId: e2.clienteId, montoPago: "abc" },
        { clienteId: e2.clienteId, montoPago: 1000, fecha: "03/01/2043" },
        { clienteId: e2.clienteId, montoPago: 100001 },
      ]) {
        const r = await llamar(C.procesarPagoAlquileres, { body });
        assert.equal(r.status, 400, JSON.stringify(body));
      }
    });

    test("un alquiler cancelado deja de ser deuda", async () => {
      await llamar(C.updateEstadoAlquiler, {
        params: { id: String(a2) },
        body: { AlquilerEstado: "Cancelado" },
      });
      const pend = await Alquiler.getAlquileresPendientesPorCliente(e2.clienteId);
      assert.equal(pend.length, 0);
      const r = await llamar(C.procesarPagoAlquileres, {
        body: { clienteId: e2.clienteId, montoPago: 1000 },
      });
      assert.equal(r.status, 400);
    });
  });

  describe("entrega y pagos siempre coinciden", () => {
    const Registro = require("../controllers/registrodiariocaja.controller");
    let e4;
    let a1;
    let a2;

    // Lo entregado debe ser igual a la suma de lo registrado en alquilerpago
    const verificarInvariante = async (id) => {
      const a = await alquilerDe(id);
      const { rows } = await pool.query(
        `SELECT COALESCE(SUM("AlquilerPagoMonto"), 0) s FROM alquilerpago WHERE "AlquilerId" = $1`,
        [id]
      );
      assert.equal(Number(rows[0].s), a.AlquilerEntrega, `alquiler #${id}`);
      return a.AlquilerEntrega;
    };
    const registroDelCobro = async (id) =>
      (
        await pool.query(
          `SELECT "RegistroDiarioCajaId" FROM alquilerpago
           WHERE "AlquilerId" = $1 AND "RegistroDiarioCajaId" IS NOT NULL
           ORDER BY "AlquilerPagoId" DESC LIMIT 1`,
          [id]
        )
      ).rows[0].RegistroDiarioCajaId;

    before(async () => {
      e4 = await crearEntorno({ stock: 5 });
      a1 = (await crear(e4.alquiler({ AlquilerFechaAlquiler: "2045-01-01", AlquilerTotal: 100000 }))).id;
      a2 = (await crear(e4.alquiler({ AlquilerFechaAlquiler: "2045-01-02", AlquilerTotal: 100000 }))).id;
      // Un cobro compartido: 100.000 a a1 y 50.000 a a2
      await llamar(C.procesarPagoAlquileres, {
        body: { clienteId: e4.clienteId, montoPago: 150000, tipoPago: "EF", cajaId: e4.cajaId, usuarioId: e4.usuarioId },
      });
    });
    after(() => e4?.limpiar());

    test("tras el cobro compartido", async () => {
      assert.equal(await verificarInvariante(a1), 100000);
      assert.equal(await verificarInvariante(a2), 50000);
    });

    test("no se puede cambiar el monto de un cobro de alquiler; el detalle sí", async () => {
      const regId = await registroDelCobro(a1);
      const malo = await llamar(Registro.update, {
        params: { id: String(regId) },
        body: { RegistroDiarioCajaMonto: 1 },
      });
      assert.equal(malo.status, 400);
      assert.match(malo.body.message, new RegExp(`#${a1}`));
      const ok = await llamar(Registro.update, {
        params: { id: String(regId) },
        body: { RegistroDiarioCajaDetalle: "Cobro corregido" },
      });
      assert.equal(ok.status, 200);
    });

    test("editar a mano la entrega queda como ajuste (en los dos sentidos)", async () => {
      for (const entrega of [70000, 90000]) {
        const r = await llamar(C.updateAlquiler, {
          params: { id: String(a2) },
          body: { AlquilerEntrega: entrega },
        });
        assert.equal(r.status, 200);
        assert.equal(await verificarInvariante(a2), entrega);
      }
      const pagos = await Alquiler.getPagosReporte([a2]);
      assert.deepEqual(
        pagos
          .get(a2)
          .filter((p) => p.RegistroDiarioCajaDetalle === "Ajuste manual de la entrega")
          .map((p) => p.RegistroDiarioCajaMonto),
        [20000, 20000]
      );
    });

    test("sin cambiar la entrega no se registra ningún ajuste", async () => {
      const antes = (await Alquiler.getPagosReporte([a2])).get(a2).length;
      await llamar(C.updateAlquiler, {
        params: { id: String(a2) },
        body: { AlquilerEntrega: 90000, AlquilerEstado: "Entregado" },
      });
      assert.equal((await Alquiler.getPagosReporte([a2])).get(a2).length, antes);
    });

    test("borrar el movimiento de caja descuenta el cobro de cada alquiler", async () => {
      const regId = await registroDelCobro(a1);
      const r = await llamar(Registro.delete, { params: { id: String(regId) } });
      assert.equal(r.status, 200);
      assert.deepEqual(
        r.body.alquileresAjustados.map((x) => [x.AlquilerId, x.monto]),
        [
          [a1, 100000],
          [a2, 50000],
        ]
      );
      assert.equal(await verificarInvariante(a1), 0);
      // a2 tenía 90.000 (50.000 del cobro + 40.000 de ajustes)
      assert.equal(await verificarInvariante(a2), 40000);
    });
  });

  describe("permisos", () => {
    // Ejecuta el middleware y devuelve "pasa" o el código de error
    const probar = (usuarioId, menu, accion) =>
      new Promise((resolve, reject) => {
        const res = {
          status(codigo) {
            resolve(codigo);
            return { json() {} };
          },
        };
        verificarPermiso(menu, accion)({ user: { id: usuarioId } }, res, (err) =>
          err ? reject(err) : resolve("pasa")
        );
      });

    test("sin permisos: 403; sin usuario: 401", async () => {
      assert.equal(await probar(e.usuarioId, "ALQUILER", "editar"), 403);
      assert.equal(await probar(undefined, "ALQUILER", "editar"), 401);
    });

    test("un perfil da solo las acciones que tiene", async () => {
      await e.darPermiso("ALQUILER", ["editar"]);
      assert.equal(await probar(e.usuarioId, "ALQUILER", "editar"), "pasa");
      assert.equal(await probar(e.usuarioId, "ALQUILER", "eliminar"), 403);
      assert.equal(await probar(e.usuarioId, "PRODUCTOS", "editar"), 403);
    });

    test("el administrador pasa siempre, según la base y no el token", async () => {
      await pool.query(`UPDATE usuario SET "UsuarioIsAdmin" = 'S' WHERE "UsuarioId" = $1`, [e.usuarioId]);
      assert.equal(await probar(e.usuarioId, "USUARIOS", "eliminar"), "pasa");
      await pool.query(`UPDATE usuario SET "UsuarioIsAdmin" = 'N' WHERE "UsuarioId" = $1`, [e.usuarioId]);
      assert.equal(await probar(e.usuarioId, "USUARIOS", "eliminar"), 403);
    });
  });
});
