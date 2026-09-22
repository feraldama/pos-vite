/**
 * Tests del traductor de SQL MySQL -> PostgreSQL (api/config/db.js).
 *
 * Los modelos siguen escritos en dialecto MySQL y se traducen en caliente, así
 * que una incompatibilidad no se ve al compilar: revienta en producción. Cada
 * caso de acá corresponde a algo que efectivamente usan los modelos.
 *
 *   node --test tests/
 */
const test = require("node:test");
const assert = require("node:assert");

// db.js llama a dotenv.config() sin ruta: depende del directorio actual.
process.env.DB_NAME = process.env.DB_NAME || "decorpar_test";
const { translateQuery, pool } = require("../config/db");

// Normaliza espacios para comparar sin pelear con el formato.
const t = (sql) => translateQuery(sql).replace(/\s+/g, " ").trim();

test.after(() => pool.end());

test("convierte los marcadores ? en $1, $2 ...", () => {
  assert.strictEqual(
    t("SELECT * FROM producto WHERE ProductoId = ? AND LocalId = ?"),
    'SELECT * FROM producto WHERE "ProductoId" = $1 AND "LocalId" = $2'
  );
});

test("pasa los backticks a comillas dobles", () => {
  assert.strictEqual(
    t("SELECT `ProductoNombre` FROM `producto`"),
    'SELECT "ProductoNombre" FROM "producto"'
  );
});

test("entrecomilla los identificadores CamelCase y deja las tablas en minúscula", () => {
  assert.strictEqual(
    t("SELECT p.LocalId FROM producto p JOIN Local l ON p.LocalId = l.LocalId"),
    'SELECT p."LocalId" FROM producto p JOIN local l ON p."LocalId" = l."LocalId"'
  );
});

test("no toca las palabras reservadas", () => {
  const out = t("SELECT COUNT(*) as total FROM venta ORDER BY VentaId DESC");
  assert.ok(!out.includes('"SELECT"'), "SELECT no debe entrecomillarse");
  assert.ok(!out.includes('"ORDER"'), "ORDER no debe entrecomillarse");
  assert.ok(out.includes('"VentaId"'));
});

test("LIKE pasa a ILIKE (en MySQL la collation era case-insensitive)", () => {
  assert.ok(t("SELECT * FROM producto WHERE ProductoNombre LIKE ?").includes("ILIKE $1"));
});

test("castea a texto las columnas comparadas con LIKE", () => {
  // Sin el ::text PostgreSQL falla con "el operador no existe: integer ~~* unknown"
  assert.strictEqual(
    t("SELECT * FROM caja WHERE CajaDescripcion LIKE ?"),
    'SELECT * FROM caja WHERE "CajaDescripcion"::text ILIKE $1'
  );
});

test("traduce CAST(... AS CHAR) a AS TEXT", () => {
  assert.ok(t("SELECT CAST(CajaMonto AS CHAR) FROM caja").includes("AS TEXT)"));
});

test("traduce IFNULL a COALESCE y CURDATE() a CURRENT_DATE", () => {
  assert.strictEqual(
    t("SELECT IFNULL(Total, 0) FROM venta WHERE VentaFecha = CURDATE()"),
    'SELECT COALESCE("Total", 0) FROM venta WHERE "VentaFecha" = CURRENT_DATE'
  );
});

test("traduce DATE_FORMAT a TO_CHAR con el formato convertido", () => {
  assert.strictEqual(
    t("SELECT DATE_FORMAT(VentaFecha, '%d/%m/%Y') FROM venta"),
    `SELECT TO_CHAR("VentaFecha", 'DD/MM/YYYY') FROM venta`
  );
});

test("no altera el contenido de los literales de texto", () => {
  const out = t("SELECT * FROM venta WHERE VentaTipo = 'CR'");
  assert.ok(out.includes("'CR'"), "el literal debe quedar intacto");
  assert.ok(!out.includes('"CR"'), "el literal no debe entrecomillarse como identificador");
});

test("un ? dentro de un literal no consume un marcador", () => {
  // Si el traductor lo contara, los parámetros quedarían corridos y la
  // consulta fallaría con "bind entrega N parámetros pero requiere M".
  assert.strictEqual(
    t("SELECT 'tiene ? adentro' AS x FROM venta WHERE ClienteId = ?"),
    `SELECT 'tiene ? adentro' AS x FROM venta WHERE "ClienteId" = $1`
  );
});

test("traduce un INSERT completo", () => {
  assert.strictEqual(
    t("INSERT INTO venta (VentaFecha, ClienteId) VALUES (?, ?)"),
    'INSERT INTO venta ("VentaFecha", "ClienteId") VALUES ($1, $2)'
  );
});

test("traduce LIMIT / OFFSET sin cambios de sintaxis", () => {
  assert.strictEqual(
    t("SELECT * FROM producto ORDER BY ProductoNombre ASC LIMIT ? OFFSET ?"),
    'SELECT * FROM producto ORDER BY "ProductoNombre" ASC LIMIT $1 OFFSET $2'
  );
});

test("traduce un UPDATE con la columna a ambos lados", () => {
  assert.strictEqual(
    t("UPDATE producto SET ProductoStock = ProductoStock + ? WHERE ProductoId = ?"),
    'UPDATE producto SET "ProductoStock" = "ProductoStock" + $1 WHERE "ProductoId" = $2'
  );
});
