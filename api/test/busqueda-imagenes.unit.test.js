// Tests sin base de datos: armado de la búsqueda de clientes y anchos de las
// miniaturas de productos.
const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  condicionBusquedaCliente,
  palabrasDeBusqueda,
  quitarTildes,
} = require("../utils/busquedaCliente");

test("palabrasDeBusqueda: separa palabras y junta los números escritos por partes", () => {
  assert.deepEqual(palabrasDeBusqueda("  morales   luis "), ["morales", "luis"]);
  assert.deepEqual(palabrasDeBusqueda("0982 497 769"), ["0982497769"]);
  assert.deepEqual(palabrasDeBusqueda("4.725.413-0"), ["47254130"]);
  assert.deepEqual(palabrasDeBusqueda(""), []);
  assert.deepEqual(palabrasDeBusqueda(" - . "), []);
  assert.equal(palabrasDeBusqueda("a b c d e f g").length, 5);
});

test("quitarTildes: saca tildes y diéresis pero respeta la ñ", () => {
  assert.equal(quitarTildes("ALARCÓN Güemes ñandú"), "ALARCON Guemes ñandu");
});

test("condicionBusquedaCliente: sin búsqueda no filtra", () => {
  assert.deepEqual(condicionBusquedaCliente(""), { sql: "TRUE", params: [] });
});

test("condicionBusquedaCliente: cada palabra es una condición (AND) sin tildes", () => {
  const { sql, params } = condicionBusquedaCliente("José morales");
  assert.equal(sql.split(" AND ").length, 2);
  assert.deepEqual(params, ["%Jose%", "%morales%"]);
  // Sin dígitos no compara contra cédula ni teléfono
  assert.doesNotMatch(sql, /regexp_replace/);
});

test("condicionBusquedaCliente: números cortos buscan cédula pero no teléfono", () => {
  const { sql, params } = condicionBusquedaCliente("471");
  assert.match(sql, /regexp_replace\(c\.ClienteRUC/);
  assert.doesNotMatch(sql, /ClienteTelefono/);
  assert.deepEqual(params, ["%471%", "%471%"]);
});

test("condicionBusquedaCliente: desde 4 dígitos también busca en el teléfono", () => {
  const { sql, params } = condicionBusquedaCliente("0982 497 769");
  assert.match(sql, /c\.ClienteTelefono,/);
  assert.equal(params.length, 3);
  assert.ok(params.every((p) => p === "%0982497769%"));
});

test("condicionBusquedaCliente: usa el alias de tabla indicado", () => {
  const { sql } = condicionBusquedaCliente("perez", "cli");
  assert.match(sql, /cli\.ClienteNombre/);
  assert.doesNotMatch(sql, /\bc\.Cliente/);
});

const { normalizarAncho } = require("../utils/miniaturaProducto");

test("normalizarAncho: redondea hacia arriba a los anchos permitidos", () => {
  assert.equal(normalizarAncho(undefined), 320);
  assert.equal(normalizarAncho("basura"), 320);
  assert.equal(normalizarAncho(1), 96);
  assert.equal(normalizarAncho("160"), 160);
  assert.equal(normalizarAncho(161), 320);
  assert.equal(normalizarAncho(99999), 1200);
});
