// Transforma el dump MySQL de amimarDatos.sql al formato PostgreSQL del proyecto nuevo
// Saltea tablas: menu, perfilmenu, westernenvio
// Modifica tabla `caja` para incluir CajaTipoId = 1 (INTERNAS)
const fs = require("fs");

const SRC = "D:/Sistemas/Amimar/amimarDatos.sql";
const DST = "D:/Sistemas/amimar-vite/migracion/migrate-data.sql";

const SKIP = new Set(["menu", "perfilmenu", "westernenvio"]);

// Orden para DELETE (hijos primero) — y para INSERT usamos replication_role=replica asi que FK se ignora
const TABLES_TO_CLEAR = [
  "cajagasto",
  "tipogastogrupo",
  "colegiocobranza",
  "nomina",
  "colegiocurso",
  "colegio",
  "jsicobro",
  "pagotrans",
  "pagoadmin",
  "cierrediario",
  "registrodiariocaja",
  "divisamovimiento",
  "divisa",
  "factura",
  "horariouso",
  "mensaje",
  "usuarioperfil",
  "perfil",
  "clientes",
  "transporte",
  "tipogasto",
  "caja",
  "local",
  "usuario",
];

// Columnas de PK autoincremental (para reset de secuencia)
const SEQ_COLS = {
  caja: "CajaId",
  cierrediario: "CierreDiarioId",
  clientes: "ClienteId",
  colegio: "ColegioId",
  colegiocobranza: "ColegioCobranzaId",
  divisa: "DivisaId",
  divisamovimiento: "DivisaMovimientoId",
  factura: "FacturaId",
  horariouso: "HorarioUsoId",
  jsicobro: "JSICobroId",
  local: "LocalId",
  mensaje: "MensajeId",
  nomina: "NominaId",
  pagoadmin: "PagoAdminId",
  pagotrans: "PagoTransId",
  perfil: "PerfilId",
  registrodiariocaja: "RegistroDiarioCajaId",
  tipogasto: "TipoGastoId",
  transporte: "TransporteId",
};

console.log("Leyendo", SRC);
const content = fs.readFileSync(SRC, "utf8");
console.log("Tamaño:", content.length, "bytes");

// Parseador que respeta comillas con escape MySQL (\')
function splitTuples(s) {
  const tuples = [];
  let depth = 0;
  let inStr = false;
  let start = -1;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (c === "\\") {
        i++;
        continue;
      } // saltar char siguiente
      if (c === "'") inStr = false;
    } else {
      if (c === "'") inStr = true;
      else if (c === "(") {
        if (depth === 0) start = i;
        depth++;
      } else if (c === ")") {
        depth--;
        if (depth === 0) tuples.push(s.slice(start, i + 1));
      }
    }
  }
  return tuples;
}

// Extraer bloques INSERT INTO `tbl` (cols) VALUES ...;
const re = /INSERT INTO `(\w+)` \(([^)]+)\) VALUES\s*([\s\S]*?);\s*\n/g;

const inserts = {};
let m;
let count = 0;
while ((m = re.exec(content)) !== null) {
  const [, table, colsRaw, valuesRaw] = m;
  count++;
  if (SKIP.has(table)) continue;
  if (!inserts[table]) inserts[table] = { cols: colsRaw, tuples: [] };
  const tuples = splitTuples(valuesRaw);
  inserts[table].tuples.push(...tuples);
}
console.log(
  `Bloques INSERT encontrados: ${count}; tablas importables: ${
    Object.keys(inserts).length
  }`
);

// Construir salida
const out = [];
out.push("-- Migración MySQL (amimar) → PostgreSQL (cobranza)");
out.push("-- Generado automáticamente");
out.push("SET client_encoding = 'UTF8';");
out.push("SET standard_conforming_strings = off;"); // permite \' como escape
out.push("SET escape_string_warning = off;");
out.push("BEGIN;");
out.push("SET session_replication_role = 'replica';"); // desactiva FK
out.push("");

// Limpieza de tablas destino
out.push("-- Limpieza de datos existentes");
for (const t of TABLES_TO_CLEAR) {
  out.push(`DELETE FROM "${t}";`);
}
out.push("");

// Inserts por tabla
for (const [table, info] of Object.entries(inserts)) {
  const tuples = info.tuples;
  if (tuples.length === 0) continue;

  let cols = info.cols.replace(/`([^`]+)`/g, '"$1"');
  let processedTuples = tuples;

  if (table === "caja") {
    cols = cols + ', "CajaTipoId"';
    // Agregar ", 1" antes del paréntesis de cierre de cada tupla
    processedTuples = tuples.map((t) => t.replace(/\)\s*$/, ", 1)"));
  }

  out.push(`-- ${table}: ${tuples.length} registros`);
  // Insertar en chunks para evitar sentencias gigantes
  const CHUNK = 500;
  for (let i = 0; i < processedTuples.length; i += CHUNK) {
    const chunk = processedTuples.slice(i, i + CHUNK);
    out.push(
      `INSERT INTO "${table}" (${cols}) VALUES\n${chunk.join(",\n")};`
    );
  }
  out.push("");
}

// Reset de secuencias
out.push("-- Reset de secuencias");
for (const [t, col] of Object.entries(SEQ_COLS)) {
  out.push(
    `SELECT setval('"${t}_${col}_seq"', COALESCE((SELECT MAX("${col}") FROM "${t}"), 0) + 1, false);`
  );
}

out.push("");
out.push("SET session_replication_role = 'origin';");
out.push("COMMIT;");

console.log("Escribiendo", DST);
fs.writeFileSync(DST, out.join("\n"), "utf8");
console.log("Tamaño salida:", out.join("\n").length, "bytes");
console.log("Listo");

// Resumen
for (const [table, info] of Object.entries(inserts)) {
  console.log(`  ${table}: ${info.tuples.length} filas`);
}
