const { Pool, types } = require("pg");
require("dotenv").config();

// Capa de acceso a PostgreSQL que conserva la firma de mysql2
// (query(sql, params, callback), insertId, affectedRows). Gracias a eso los
// modelos existentes siguen funcionando sin cambios: las consultas se escriben
// en dialecto MySQL y se traducen en caliente.
//
// Portado desde la rama alquiler-prendas, adaptado al esquema de decorpar.

// bigint y numeric llegan como string por defecto; los convertimos a número
// (los montos de esta app entran cómodamente en el rango seguro de JS)
types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10))); // int8
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v))); // numeric

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "decorpar",
  max: 15,
  idleTimeoutMillis: 60000,
});

// Tablas con clave autogenerada (para emular insertId de mysql2)
const AUTO_PK = {
  almacen: "AlmacenId",
  caja: "CajaId",
  clientes: "ClienteId",
  combo: "ComboId",
  compra: "CompraId",
  facturacredito: "FacturaCreditoId",
  local: "LocalId",
  perfil: "PerfilId",
  producto: "ProductoId",
  proveedor: "ProveedorId",
  registrodiariocaja: "RegistroDiarioCajaId",
  tipogasto: "TipoGastoId",
  traslado: "TrasladoId",
  venta: "VentaId",
  ventacredito: "VentaCreditoId",
};

// Nombres de tablas (en MySQL/Windows eran case-insensitive; en PG son minúsculas)
const TABLE_NAMES = new Set([
  "almacen", "caja", "clientes", "combo", "compra", "compraproducto",
  "facturacredito", "facturacreditopago", "local", "menu", "perfil",
  "perfilmenu", "producto", "productoalmacen", "proveedor",
  "registrodiariocaja", "tipogasto", "tipogastogrupo", "traslado", "usuario",
  "usuarioperfil", "venta", "ventacredito", "ventacreditopago", "ventaproducto",
]);

const SQL_KEYWORDS = new Set(
  `SELECT FROM WHERE AND OR NOT NULL TRUE FALSE AS ON JOIN LEFT RIGHT INNER OUTER FULL CROSS
   ORDER GROUP BY HAVING LIMIT OFFSET INSERT INTO VALUES UPDATE SET DELETE DISTINCT UNION ALL
   CASE WHEN THEN ELSE END LIKE ILIKE BETWEEN IN IS ASC DESC INTERVAL RETURNING CONFLICT DO
   NOTHING EXISTS ANY SOME CAST CHAR TEXT INTEGER BIGINT SMALLINT NUMERIC DECIMAL DATE TIME
   TIMESTAMP DAY MONTH YEAR HOUR MINUTE SECOND USING NULLS FIRST LAST`
    .trim()
    .split(/\s+/)
);

const DATE_FORMAT_MAP = {
  "%Y": "YYYY",
  "%y": "YY",
  "%m": "MM",
  "%c": "FMMM",
  "%d": "DD",
  "%e": "FMDD",
  "%H": "HH24",
  "%h": "HH12",
  "%i": "MI",
  "%s": "SS",
  "%p": "AM",
};

function convertDateFormat(fmt) {
  return fmt.replace(/%[a-zA-Z]/g, (t) => DATE_FORMAT_MAP[t] || t);
}

/**
 * Traduce una consulta estilo MySQL a PostgreSQL:
 *  - `col` -> "col"; identificadores CamelCase sin comillas -> "CamelCase"
 *  - ? -> $1, $2, ...
 *  - DATE_FORMAT/IFNULL/CURDATE/NOW/DATE_ADD/DATE_SUB/CAST AS CHAR
 *  - columna LIKE -> columna::text LIKE
 */
function translateQuery(sql) {
  let out = sql.replace(/`/g, '"');

  // Funciones de fecha/uso general (antes de proteger literales, sus argumentos son simples)
  out = out.replace(
    /DATE_FORMAT\s*\(\s*([^,()]+(?:\([^()]*\))?[^,()]*)\s*,\s*'([^']+)'\s*\)/gi,
    (_, expr, fmt) => `TO_CHAR(${expr.trim()}, '${convertDateFormat(fmt)}')`
  );
  out = out.replace(
    /DATE_(ADD|SUB)\s*\(\s*([^,]+?)\s*,\s*INTERVAL\s+(\?|\d+)\s+(DAY|MONTH|YEAR|HOUR|MINUTE|SECOND)\s*\)/gi,
    (_, op, expr, n, unit) =>
      `(${expr.trim()} ${op.toUpperCase() === "ADD" ? "+" : "-"} (${n})::int * INTERVAL '1 ${unit.toLowerCase()}')`
  );
  out = out.replace(/\bIFNULL\s*\(/gi, "COALESCE(");
  out = out.replace(/\bCURDATE\s*\(\s*\)/gi, "CURRENT_DATE");
  out = out.replace(/\bRAND\s*\(\s*\)/gi, "RANDOM()");
  out = out.replace(/\bAS\s+CHAR\s*\)/gi, "AS TEXT)");
  out = out.replace(/\bAS\s+SIGNED\s*\)/gi, "AS BIGINT)");
  out = out.replace(/\bAS\s+UNSIGNED\s*\)/gi, "AS BIGINT)");

  // Proteger literales de texto y transformar solo el SQL "real"
  const parts = out.split(/('(?:[^']|'')*')/);
  let paramIndex = 0;
  for (let i = 0; i < parts.length; i += 2) {
    let seg = parts[i];
    // identificadores con mayúsculas y minúsculas mezcladas -> entre comillas
    seg = seg.replace(/(^|[^\w"])([A-Za-z_][A-Za-z0-9_]*)(?![\w"(])/g, (full, pre, word) => {
      const hasUpper = /[A-Z]/.test(word);
      const hasLower = /[a-z]/.test(word);
      if (!hasUpper || !hasLower) return full;
      if (SQL_KEYWORDS.has(word.toUpperCase())) return full;
      if (TABLE_NAMES.has(word.toLowerCase())) return `${pre}${word.toLowerCase()}`;
      return `${pre}"${word}"`;
    });
    // LIKE de MySQL (collation _ci) era case-insensitive; en PG usamos ILIKE
    seg = seg.replace(/\bLIKE\b/gi, "ILIKE");
    // placeholders
    seg = seg.replace(/\?/g, () => `$${++paramIndex}`);
    parts[i] = seg;
  }
  out = parts.join("");

  // LIKE sobre columnas (en MySQL los números aceptan LIKE; en PG casteamos a texto)
  out = out.replace(/("[A-Za-z0-9_]+")(\s+(?:NOT\s+)?I?LIKE\b)/g, "$1::text$2");

  return out;
}

function shapeResult(text, res) {
  const cmd = res.command;
  if (
    cmd === "SELECT" ||
    (res.rows && res.rows.length && cmd !== "INSERT" && cmd !== "UPDATE" && cmd !== "DELETE")
  ) {
    return res.rows;
  }
  const shaped = {
    affectedRows: res.rowCount || 0,
    changedRows: res.rowCount || 0,
    rows: res.rows || [],
    insertId: 0,
  };
  if (cmd === "INSERT" && res.rows && res.rows.length) {
    const first = res.rows[0];
    const key = Object.keys(first)[0];
    if (key !== undefined) shaped.insertId = first[key];
  }
  return shaped;
}

/**
 * Compatible con la firma de mysql2: query(sql, [params], callback)
 */
function query(sql, params, callback) {
  if (typeof params === "function") {
    callback = params;
    params = [];
  }
  params = params || [];

  let text;
  try {
    text = translateQuery(sql);
  } catch (e) {
    if (callback) return callback(e);
    return Promise.reject(e);
  }

  // Emular insertId: agregar RETURNING de la PK autogenerada
  const insMatch = /^\s*INSERT\s+INTO\s+"?(\w+)"?/i.exec(text);
  if (insMatch && !/RETURNING/i.test(text)) {
    const pk = AUTO_PK[insMatch[1].toLowerCase()];
    if (pk) text = `${text.replace(/;\s*$/, "")} RETURNING "${pk}"`;
  }

  const promise = pool
    .query(text, params)
    .then((res) => shapeResult(text, res))
    .catch((err) => {
      err.query = text;
      throw err;
    });

  if (callback) {
    promise.then(
      (result) => callback(null, result),
      (err) => {
        console.error("Error en consulta PostgreSQL:", err.message, "\nSQL:", err.query || sql);
        callback(err);
      }
    );
    return;
  }
  return promise;
}

/**
 * Ejecuta fn(client) dentro de una transacción.
 * client.q(sql, params) aplica la misma traducción de consultas.
 */
async function withTransaction(fn) {
  const client = await pool.connect();
  client.q = (sql, params = []) => client.query(translateQuery(sql), params).then((res) => res);
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    delete client.q;
    client.release();
  }
}

// Verificar la conexión al iniciar
pool
  .query("SELECT 1")
  .then(() => console.log("Conectado a PostgreSQL"))
  .catch((err) => console.error("Error conectando a PostgreSQL:", err.message));

pool.on("error", (err) => {
  console.error("Error en el pool de PostgreSQL:", err.message);
});

module.exports = { query, pool, withTransaction, translateQuery };
