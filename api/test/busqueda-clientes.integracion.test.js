// Tests contra la base: búsqueda de clientes (dashboard y pantalla de
// Clientes). Usan los datos propios de crearEntorno y los borran al final.
const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { pool, llamar, crearEntorno } = require("./entorno");
const C = require("../controllers/alquiler.controller");
const Alquiler = require("../models/alquiler.model");
const Cliente = require("../models/cliente.model");

const saltear = process.env.SKIP_DB_TESTS === "1";

// Número aleatorio de n dígitos (para que los datos de prueba sean únicos)
const digitos = (n) =>
  Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");

describe("búsqueda de clientes (integración)", { skip: saltear }, () => {
  let e;
  const ci = digitos(7);
  const ruc = `${ci}-${digitos(1)}`;
  const telefono = `09${digitos(8)}`;

  before(async () => {
    e = await crearEntorno({ stock: 2 });
    // Cliente con tilde, cédula y teléfono; el apellido del entorno es único
    // y sirve para que la búsqueda no choque con datos reales
    await pool.query(
      `UPDATE clientes SET "ClienteNombre" = 'JOSÉ', "ClienteRUC" = $1,
         "ClienteTelefono" = $2
       WHERE "ClienteId" = $3`,
      [ruc, telefono, e.clienteId]
    );
    // Alquiler pendiente en 2040: fuera de cualquier rango "próximos N días"
    const r = await llamar(C.createAlquiler, {
      body: e.alquiler({ CajaId: e.cajaId, UsuarioId: e.usuarioId }),
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
  });
  after(async () => {
    await e?.limpiar();
    await pool.end();
  });

  describe("dashboard: alquileres próximos", () => {
    const apellido = () =>
      pool
        .query(`SELECT "ClienteApellido" FROM clientes WHERE "ClienteId" = $1`, [
          e.clienteId,
        ])
        .then((r) => r.rows[0].ClienteApellido);

    const buscar = async (controlador, q) =>
      (await llamar(controlador, { query: { dias: "7", q } })).body;

    test("sin búsqueda respeta el rango de fechas (no aparece el de 2040)", async () => {
      const body = await buscar(C.getAlquileresProximosEntrega, "");
      assert.ok(!body.data.some((a) => a.ClienteId === e.clienteId));
    });

    test("con búsqueda ignora las fechas y encuentra por nombre sin tilde", async () => {
      const ap = await apellido();
      for (const q of [`jose ${ap}`, `${ap} JOSÉ`]) {
        const body = await buscar(C.getAlquileresProximosEntrega, q);
        assert.equal(body.success, true);
        assert.deepEqual(
          body.data.map((a) => a.ClienteId),
          [e.clienteId],
          `búsqueda "${q}"`
        );
        assert.equal(body.recortada, false);
        assert.equal(body.data[0].ClienteRUC, ruc);
        assert.ok(Array.isArray(body.data[0].prendas));
      }
    });

    test("encuentra por cédula con puntos y por teléfono escrito por partes", async () => {
      const conPuntos = ci.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      const telPorPartes = `${telefono.slice(0, 4)} ${telefono.slice(4, 7)}-${telefono.slice(7)}`;
      for (const q of [conPuntos, ruc, telefono, telPorPartes]) {
        const entrega = await buscar(C.getAlquileresProximosEntrega, q);
        const devolucion = await buscar(C.getAlquileresProximosDevolucion, q);
        for (const body of [entrega, devolucion]) {
          assert.ok(
            body.data.some((a) => a.ClienteId === e.clienteId),
            `búsqueda "${q}"`
          );
        }
      }
    });

    test("recorta al límite y avisa cuando hay más resultados", async () => {
      const original = Alquiler.LIMITE_BUSQUEDA;
      Alquiler.LIMITE_BUSQUEDA = 0; // cualquier resultado ya supera el límite
      try {
        const body = await buscar(C.getAlquileresProximosEntrega, telefono);
        assert.equal(body.recortada, true);
        assert.equal(body.data.length, 0);
        assert.equal(body.limite, 0);
      } finally {
        Alquiler.LIMITE_BUSQUEDA = original;
      }
    });
  });

  describe("pantalla de Clientes", () => {
    test("busca por teléfono, cédula con puntos y nombre sin tilde", async () => {
      const conPuntos = ci.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      for (const q of [telefono, conPuntos, `jose ${ci}`]) {
        const { clientes, total } = await Cliente.search(q, 10, 0, "ClienteId", "ASC");
        assert.ok(
          clientes.some((c) => c.ClienteId === e.clienteId),
          `búsqueda "${q}"`
        );
        assert.ok(total >= 1);
      }
    });

    test("un número solo también encuentra por ID exacto", async () => {
      const { clientes } = await Cliente.search(
        String(e.clienteId),
        100,
        0,
        "ClienteId",
        "ASC"
      );
      assert.ok(clientes.some((c) => c.ClienteId === e.clienteId));
    });
  });
});
