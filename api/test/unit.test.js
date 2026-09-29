// Tests sin base de datos: traducción de consultas y cálculos de montos.
// Correr con `npm test` (o `node --test test/`)
const { test } = require("node:test");
const assert = require("node:assert/strict");

const { translateQuery, pool } = require("../config/db");
const { _internos } = require("../controllers/alquiler.controller");
const { validarMontos, entregaDePagos, movimientosDePago } = _internos;

// config/db abre el pool al cargarse; sin cerrarlo el proceso no termina
test.after(() => pool.end());

test("translateQuery: comillas en CamelCase, tablas en minúscula y placeholders", () => {
  const sql = translateQuery(
    "SELECT a.AlquilerId FROM Alquiler a WHERE a.ClienteId = ? AND a.AlquilerEstado = ?"
  );
  assert.equal(
    sql,
    'SELECT a."AlquilerId" FROM alquiler a WHERE a."ClienteId" = $1 AND a."AlquilerEstado" = $2'
  );
});

test("translateQuery: no toca los literales de texto", () => {
  const sql = translateQuery("SELECT 1 FROM alquiler WHERE AlquilerEstado = 'Pendiente ?'");
  assert.match(sql, /'Pendiente \?'/);
});

test("translateQuery: LIKE pasa a ILIKE sobre texto", () => {
  const sql = translateQuery("SELECT 1 FROM producto WHERE ProductoNombre LIKE ?");
  assert.match(sql, /"ProductoNombre"::text ILIKE \$1/);
});

test("entregaDePagos: suma importes base, sin recargo ni voucher", () => {
  assert.equal(
    entregaDePagos({
      efectivo: 10,
      transferencia: 20,
      tarjetaDebito: 100,
      tarjetaCredito: 100,
      voucher: 999,
    }),
    230
  );
  assert.equal(entregaDePagos({}), 0);
});

test("movimientosDePago: caja con recargo, aplicado sin recargo, sin voucher", () => {
  const movs = movimientosDePago(
    { efectivo: 50000, tarjetaDebito: 100000, tarjetaCredito: 100000, voucher: 30000 },
    7
  );
  assert.deepEqual(
    movs.map((m) => [m.RegistroDiarioCajaMonto, m.MontoAplicado, m.TipoGastoGrupoId]),
    [
      [50000, 50000, 1],
      [103000, 100000, 4],
      [105000, 100000, 4],
    ]
  );
  assert.equal(movs[0].RegistroDiarioCajaDetalle, "Alquiler #7 - Efectivo");
});

test("validarMontos: acepta montos válidos", () => {
  assert.equal(
    validarMontos({
      AlquilerTotal: 300,
      AlquilerEntrega: 0,
      prendas: [{ ProductoId: 1, AlquilerPrendasPrecio: 300 }],
      pagos: { efectivo: 100, voucher: 50 },
    }),
    null
  );
});

test("validarMontos: rechaza negativos, no numéricos y prendas inválidas", () => {
  assert.match(validarMontos({ AlquilerTotal: -1 }), /AlquilerTotal/);
  assert.match(validarMontos({ AlquilerEntrega: "abc" }), /AlquilerEntrega/);
  assert.match(validarMontos({ pagos: { efectivo: -5 } }), /efectivo/);
  assert.match(
    validarMontos({ prendas: [{ ProductoId: 1, AlquilerPrendasPrecio: -1 }] }),
    /prenda 1/
  );
  assert.match(validarMontos({ prendas: [{ AlquilerPrendasPrecio: 1 }] }), /prenda 1/);
});

test("validarMontos: el descuento no puede superar el total (también contra lo guardado)", () => {
  assert.match(
    validarMontos({ AlquilerTotal: 100, pagos: { voucher: 101 } }),
    /descuento/
  );
  // Al editar: baja el total por debajo del descuento ya guardado
  assert.match(
    validarMontos({ AlquilerTotal: 50 }, { AlquilerTotal: 300, AlquilerDescuento: 100 }),
    /descuento/
  );
  assert.equal(validarMontos({}, { AlquilerTotal: 300, AlquilerDescuento: 100 }), null);
});
