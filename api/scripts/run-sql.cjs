/**
 * Ejecuta un archivo .sql contra la base configurada en api/.env.
 *
 *   node api/scripts/run-sql.cjs db/2026-09-17_reset_servicios_lavadero.sql
 *
 * Pide confirmacion salvo que se pase --yes.
 */
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mysql = require("mysql2/promise");

async function main() {
  const args = process.argv.slice(2);
  const archivo = args.find((a) => !a.startsWith("--"));
  const confirmado = args.includes("--yes");

  if (!archivo) {
    console.error("Uso: node api/scripts/run-sql.cjs <archivo.sql> [--yes]");
    process.exit(1);
  }

  const ruta = path.resolve(archivo);
  if (!fs.existsSync(ruta)) {
    console.error(`No se encontró el archivo: ${ruta}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(ruta, "utf8");
  console.log(`Base  : ${process.env.DB_NAME} @ ${process.env.DB_HOST}`);
  console.log(`Script: ${ruta}`);

  if (!confirmado) {
    console.error("\nFalta --yes. Revisá el script antes de ejecutarlo.");
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  try {
    const resultados = await connection.query(sql);
    const sentencias = Array.isArray(resultados[0]) ? resultados[0].length : 1;
    console.log(`\nEjecutado correctamente (${sentencias} sentencias).`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Error ejecutando el SQL:", error.message);
  process.exit(1);
});
