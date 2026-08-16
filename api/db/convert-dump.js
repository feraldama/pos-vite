/**
 * Convierte el dump MySQL (phpMyAdmin) alquilerprendas.sql a PostgreSQL.
 * Salida: api/db/alquilerprendas_postgres.sql
 */
const fs = require("fs");
const path = require("path");

const SRC = "d:/Sistemas/pos-vite/alquilerprendas.sql";
const OUT = "d:/Sistemas/pos-vite/api/db/alquilerprendas_postgres.sql";

const sql = fs.readFileSync(SRC, "utf8");

// ---------- helpers ----------
function mapType(mysqlType) {
  const t = mysqlType.trim().toLowerCase();
  let m;
  if ((m = t.match(/^tinyint\(1\)/))) return "smallint";
  if (t.startsWith("tinyint")) return "smallint";
  if (t.startsWith("smallint")) return "smallint";
  if (t.startsWith("mediumint")) return "integer";
  if (t.startsWith("bigint")) return "bigint";
  if (t.startsWith("int")) return "integer";
  if ((m = t.match(/^decimal\((\d+),(\d+)\)/))) return `numeric(${m[1]},${m[2]})`;
  if ((m = t.match(/^(var)?char\((\d+)\)/))) return `varchar(${m[2]})`;
  if (t.startsWith("longblob") || t.startsWith("blob") || t.startsWith("mediumblob")) return "bytea";
  if (t.startsWith("longtext") || t.startsWith("text") || t.startsWith("mediumtext")) return "text";
  if (t === "date") return "date";
  if (t.startsWith("datetime") || t.startsWith("timestamp")) return "timestamp";
  if (t === "time") return "time";
  if (t.startsWith("double") || t.startsWith("float")) return "double precision";
  throw new Error("Tipo no mapeado: " + mysqlType);
}

// Tokeniza la lista de valores de un INSERT: (a,b,c),(d,e,f);
function parseValueTuples(str) {
  const tuples = [];
  let i = 0;
  const n = str.length;
  while (i < n) {
    while (i < n && str[i] !== "(") i++;
    if (i >= n) break;
    i++; // skip (
    const vals = [];
    let cur = "";
    let inStr = false;
    for (; i < n; i++) {
      const c = str[i];
      if (inStr) {
        if (c === "\\") {
          // escape MySQL
          const next = str[i + 1];
          const map = { n: "\n", r: "\r", t: "\t", "0": "\0", Z: "\x1a", "'": "'", '"': '"', "\\": "\\", "%": "\\%", _: "\\_" };
          cur += map[next] !== undefined ? map[next] : next;
          i++;
        } else if (c === "'") {
          if (str[i + 1] === "'") {
            cur += "'";
            i++;
          } else {
            inStr = false;
            cur += "\u0000END_STR"; // marcador de fin de string
          }
        } else {
          cur += c;
        }
      } else {
        if (c === "'") {
          inStr = true;
          cur += "\u0000STR"; // marcador de inicio
        } else if (c === "," ) {
          vals.push(cur.trim());
          cur = "";
        } else if (c === ")") {
          vals.push(cur.trim());
          tuples.push(vals);
          i++;
          break;
        } else {
          cur += c;
        }
      }
    }
  }
  return tuples;
}

function pgLiteral(raw) {
  if (raw === "NULL") return "NULL";
  if (raw.startsWith("\u0000STR")) {
    // string: quitar marcadores, recortar espacios finales (padding CHAR de GeneXus)
    let s = raw.slice(4).replace(/\u0000END_STR$/, "");
    s = s.replace(/[ ]+$/, "");
    return "'" + s.replace(/'/g, "''") + "'";
  }
  if (/^0x[0-9a-fA-F]*$/.test(raw)) {
    return "'\\x" + raw.slice(2) + "'"; // bytea hex
  }
  return raw; // número
}

// ---------- parseo del dump ----------
const tables = {}; // name -> {cols:[{name,type,notnull,default}], pk:[], indexes:[], fks:[], identity:null}
const tableOrder = [];

// CREATE TABLE
const createRe = /CREATE TABLE `(\w+)` \(([\s\S]*?)\) ENGINE=/g;
let m;
while ((m = createRe.exec(sql))) {
  const [, name, body] = m;
  const cols = [];
  for (const line of body.split("\n")) {
    const cm = line.match(/^\s*`(\w+)`\s+([^\s]+(?:\s+unsigned)?)\s*(.*?),?\s*$/);
    if (!cm) continue;
    const [, colName, type, rest] = cm;
    let pgType = mapType(type);
    // VentaUsuario era char(12) y MySQL truncaba en silencio; lo ensanchamos al
    // tamaño de usuario.UsuarioId (varchar 25) para que Postgres no rechace inserts
    if (name === "venta" && colName === "VentaUsuario") pgType = "varchar(25)";
    cols.push({
      name: colName,
      type: pgType,
      notnull: /NOT NULL/i.test(rest),
      def: /DEFAULT NULL/i.test(rest) ? null : undefined,
    });
  }
  tables[name] = { cols, pk: [], indexes: [], fks: [], identity: null, identityStart: 1 };
  tableOrder.push(name);
}

// PRIMARY KEY / KEY
const pkRe = /ALTER TABLE `(\w+)`\s+((?:ADD [^;]+));/g;
while ((m = pkRe.exec(sql))) {
  const [, name, adds] = m;
  const t = tables[name];
  if (!t) continue;
  for (const add of adds.split(/,\s*\n\s*/)) {
    let am;
    if ((am = add.match(/ADD PRIMARY KEY \(([^)]+)\)/))) {
      t.pk = am[1].split(",").map((s) => s.trim().replace(/`/g, ""));
    } else if ((am = add.match(/ADD (?:UNIQUE )?KEY `(\w+)` \(([^)]+)\)/))) {
      t.indexes.push({
        name: am[1],
        unique: /ADD UNIQUE/.test(add),
        cols: am[2].split(",").map((s) => s.trim().replace(/`/g, "")),
      });
    } else if ((am = add.match(/ADD CONSTRAINT `(\w+)` FOREIGN KEY \(([^)]+)\) REFERENCES `(\w+)` \(([^)]+)\)/))) {
      t.fks.push({
        name: am[1],
        cols: am[2].split(",").map((s) => s.trim().replace(/`/g, "")),
        refTable: am[3],
        refCols: am[4].split(",").map((s) => s.trim().replace(/`/g, "")),
      });
    }
  }
}

// AUTO_INCREMENT
const aiRe = /ALTER TABLE `(\w+)`\s+MODIFY `(\w+)` [^;]*AUTO_INCREMENT(?:=(\d+))?/g;
while ((m = aiRe.exec(sql))) {
  const [, name, col, start] = m;
  if (tables[name]) {
    tables[name].identity = col;
    tables[name].identityStart = start ? parseInt(start, 10) : 1;
  }
}
// venta.VentaId era asignado por GeneXus (sin AUTO_INCREMENT); en Postgres lo hacemos identity
if (tables.venta && !tables.venta.identity) tables.venta.identity = "VentaId";

// INSERTs
const inserts = []; // {table, cols, tuples}
const insRe = /INSERT INTO `(\w+)` \(([^)]+)\) VALUES\s*([\s\S]*?);\n/g;
while ((m = insRe.exec(sql))) {
  const [, name, colsStr, valuesStr] = m;
  inserts.push({
    table: name,
    cols: colsStr.split(",").map((s) => s.trim().replace(/`/g, "")),
    tuples: parseValueTuples(valuesStr),
  });
}

// ---------- generación ----------
const out = [];
out.push("-- Generado automáticamente desde alquilerprendas.sql (MySQL) --");
out.push("SET client_encoding = 'UTF8';");
out.push("BEGIN;");
out.push("");

// 1. tablas
for (const name of tableOrder) {
  const t = tables[name];
  const colLines = t.cols.map((c) => {
    let line = `  "${c.name}" ${c.type}`;
    if (c.notnull) {
      line += " NOT NULL";
      // MySQL (modo no estricto) rellenaba columnas NOT NULL omitidas; emulamos con DEFAULTs
      // (excepto en columnas identity, que no admiten un DEFAULT previo)
      const base = t.identity === c.name ? "skip" : c.type.replace(/\(.*\)/, "");
      if (["integer", "smallint", "bigint", "numeric", "double precision"].includes(base)) {
        line += " DEFAULT 0";
      } else if (["varchar", "text"].includes(base)) {
        line += " DEFAULT ''";
      } else if (base === "bytea") {
        line += " DEFAULT '\\x'";
      }
      // date/timestamp: sin default, la app siempre los provee
    }
    return line;
  });
  if (t.pk.length) colLines.push(`  PRIMARY KEY (${t.pk.map((c) => `"${c}"`).join(", ")})`);
  out.push(`CREATE TABLE ${name} (\n${colLines.join(",\n")}\n);`);
  out.push("");
}

// 2. datos
for (const ins of inserts) {
  const colList = ins.cols.map((c) => `"${c}"`).join(", ");
  for (const tuple of ins.tuples) {
    if (tuple.length !== ins.cols.length) {
      throw new Error(`Columnas (${ins.cols.length}) != valores (${tuple.length}) en ${ins.table}`);
    }
    out.push(`INSERT INTO ${ins.table} (${colList}) VALUES (${tuple.map(pgLiteral).join(", ")});`);
  }
}
out.push("");

// Grupo de gasto para devoluciones (nuevo, usado por el endpoint /pos/devolucion)
out.push(`INSERT INTO tipogastogrupo ("TipoGastoId", "TipoGastoGrupoId", "TipoGastoGrupoDescripcion") VALUES (1, 5, 'DEVOLUCIÓN') ON CONFLICT DO NOTHING;`);
// Cliente "consumidor final" que la pantalla de ventas usa por defecto (ClienteId 1 hardcodeado en el frontend)
out.push(`INSERT INTO clientes ("ClienteId", "ClienteRUC", "ClienteRazonSocial", "ClienteNombre", "ClienteApellido", "ClienteDireccion", "ClienteTelefono", "ClienteTipo", "UsuarioId") VALUES (1, '', '', 'SIN NOMBRE', 'MINORISTA', '', '', 'MI', NULL) ON CONFLICT DO NOTHING;`);
out.push("");

// 3. índices
for (const name of tableOrder) {
  for (const idx of tables[name].indexes) {
    const idxName = `${name}_${idx.name}`.toLowerCase();
    out.push(
      `CREATE ${idx.unique ? "UNIQUE " : ""}INDEX ${idxName} ON ${name} (${idx.cols.map((c) => `"${c}"`).join(", ")});`
    );
  }
}
out.push("");

// 4. foreign keys
for (const name of tableOrder) {
  for (const fk of tables[name].fks) {
    out.push(
      `ALTER TABLE ${name} ADD CONSTRAINT ${(name + "_" + fk.name).toLowerCase()} FOREIGN KEY (${fk.cols
        .map((c) => `"${c}"`)
        .join(", ")}) REFERENCES ${fk.refTable} (${fk.refCols.map((c) => `"${c}"`).join(", ")});`
    );
  }
}
out.push("");

// 5. identity (después de cargar datos; arranca en max+1)
for (const name of tableOrder) {
  const t = tables[name];
  if (!t.identity) continue;
  out.push(`ALTER TABLE ${name} ALTER COLUMN "${t.identity}" ADD GENERATED BY DEFAULT AS IDENTITY;`);
  out.push(
    `SELECT setval(pg_get_serial_sequence('${name}', '${t.identity}'), GREATEST(COALESCE((SELECT MAX("${t.identity}") FROM ${name}), 0), ${Math.max(
      t.identityStart - 1,
      0
    )}) + 1, false);`
  );
}
out.push("");
out.push("COMMIT;");

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out.join("\n"), "utf8");

// resumen
console.log("Tablas:", tableOrder.length);
for (const name of tableOrder) {
  const rows = inserts.filter((i) => i.table === name).reduce((a, i) => a + i.tuples.length, 0);
  console.log(`  ${name}: ${rows} filas, pk=[${tables[name].pk}], identity=${tables[name].identity || "-"}`);
}
console.log("OK ->", OUT);
