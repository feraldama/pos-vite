// Observaciones del alquiler (pedidos específicos del cliente): se guardan al
// crear, se editan desde el dashboard y editar el alquiler sin mandarlas no
// las borra.
const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { pool, llamar, crearEntorno } = require("./entorno");
const C = require("../controllers/alquiler.controller");

const saltear = process.env.SKIP_DB_TESTS === "1";

describe("observaciones del alquiler (integración)", { skip: saltear }, () => {
  let e;
  let id;
  const obtener = async () =>
    (await llamar(C.getAlquilerById, { params: { id: String(id) } })).body;

  before(async () => {
    e = await crearEntorno({ stock: 2 });
    const r = await llamar(C.createAlquiler, {
      body: e.alquiler({
        AlquilerObservacion: "  agregar corbata y cinto  ",
        CajaId: e.cajaId,
        UsuarioId: e.usuarioId,
      }),
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    id = r.body.data.AlquilerId;
  });
  after(async () => {
    await e?.limpiar();
    await pool.end();
  });

  test("se guarda al crear (sin espacios de más)", async () => {
    assert.equal((await obtener()).AlquilerObservacion, "agregar corbata y cinto");
  });

  test("sin observación se guarda vacía", async () => {
    const r = await llamar(C.createAlquiler, {
      body: e.alquiler({ CajaId: e.cajaId, UsuarioId: e.usuarioId }),
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.data.AlquilerObservacion, "");
  });

  test("viene en las búsquedas del dashboard", async () => {
    // El apellido del cliente del entorno es único: lo encuentra aunque el
    // alquiler sea de 2040 (con búsqueda no se aplica el rango de fechas)
    const { rows } = await pool.query(
      `SELECT "ClienteApellido" FROM clientes WHERE "ClienteId" = $1`,
      [e.clienteId]
    );
    const r = await llamar(C.getAlquileresProximosEntrega, {
      query: { dias: "7", q: rows[0].ClienteApellido },
    });
    const propio = r.body.data.find((a) => a.AlquilerId === id);
    assert.ok(propio, "el alquiler aparece en la búsqueda");
    assert.equal(propio.AlquilerObservacion, "agregar corbata y cinto");
  });

  test("PATCH /observacion la cambia, recorta a 500 y acepta vaciarla", async () => {
    let r = await llamar(C.updateObservacionAlquiler, {
      params: { id: String(id) },
      body: { AlquilerObservacion: "retira el hermano" },
    });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.data.AlquilerObservacion, "retira el hermano");

    r = await llamar(C.updateObservacionAlquiler, {
      params: { id: String(id) },
      body: { AlquilerObservacion: "x".repeat(600) },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.AlquilerObservacion.length, 500);

    r = await llamar(C.updateObservacionAlquiler, {
      params: { id: String(id) },
      body: { AlquilerObservacion: "" },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.AlquilerObservacion, "");
  });

  test("PATCH /observacion: 400 si no es texto, 404 si no existe", async () => {
    let r = await llamar(C.updateObservacionAlquiler, {
      params: { id: String(id) },
      body: {},
    });
    assert.equal(r.status, 400);
    r = await llamar(C.updateObservacionAlquiler, {
      params: { id: "999999999" },
      body: { AlquilerObservacion: "nada" },
    });
    assert.equal(r.status, 404);
  });

  test("editar el alquiler sin mandar observación la conserva; mandándola la cambia", async () => {
    await llamar(C.updateObservacionAlquiler, {
      params: { id: String(id) },
      body: { AlquilerObservacion: "llevar cinto negro" },
    });
    const base = {
      ClienteId: e.clienteId,
      AlquilerFechaAlquiler: "2040-01-01",
      AlquilerFechaEntrega: "2040-01-05",
      AlquilerFechaDevolucion: "2040-01-08",
      AlquilerTotal: 100000,
      prendas: [{ ProductoId: e.productoId, AlquilerPrendasPrecio: 100000 }],
    };

    let r = await llamar(C.updateAlquiler, { params: { id: String(id) }, body: base });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal((await obtener()).AlquilerObservacion, "llevar cinto negro");

    r = await llamar(C.updateAlquiler, {
      params: { id: String(id) },
      body: { ...base, AlquilerObservacion: "llevar cinto marrón" },
    });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal((await obtener()).AlquilerObservacion, "llevar cinto marrón");
  });
});
