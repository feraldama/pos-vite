/**
 * Copia los datos de la base MySQL/MariaDB original a PostgreSQL.
 *
 *   node api/scripts/migrate-mysql-to-postgres.cjs [--truncate]
 *
 * El esquema de destino tiene que existir ya:
 *   psql -U postgres -d decorpar -f db/postgres/01_schema.sql
 *
 * Variables de entorno (api/.env es el de PostgreSQL, el de MySQL va aparte):
 *   PG  -> DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 *   MY  -> MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB
 *
 * --truncate vacía las tablas de destino antes de copiar (para reintentar).
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mysql = require("mysql2/promise");
const { Pool } = require("pg");
const {
  resincronizarSecuencias,
  secuenciasDesincronizadas,
} = require("./lib/sequences.cjs");

// Orden padre -> hijo, para no pelear con las claves foráneas.
// gxa0003 queda afuera a propósito: es una tabla residual de GeneXus.
const TABLAS = [
  "local",
  "menu",
  "perfil",
  "tipogasto",
  "almacen",
  "caja",
  "proveedor",
  "usuario",
  "clientes",
  "usuarioperfil",
  "perfilmenu",
  "tipogastogrupo",
  "producto",
  "productoalmacen",
  "combo",
  "registrodiariocaja",
  "venta",
  "ventaproducto",
  "ventacredito",
  "ventacreditopago",
  "compra",
  "compraproducto",
  "facturacredito",
  "facturacreditopago",
  "traslado",
];

const LOTE = 500;

async function main() {
  const truncate = process.argv.includes("--truncate");

  const my = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "localhost",
    user: process.env.MYSQL_USER || "sa",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DB || "decorpar",
    dateStrings: true,
  });

  const pg = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "decorpar",
  });

  const cliente = await pg.connect();
  try {
    await cliente.query("BEGIN");

    if (truncate) {
      const lista = TABLAS.map((t) => `"${t}"`).join(", ");
      await cliente.query(`TRUNCATE ${lista} RESTART IDENTITY CASCADE`);
      console.log("Tablas de destino vaciadas.\n");
    }

    let total = 0;
    for (const tabla of TABLAS) {
      const [filas] = await my.query("SELECT * FROM `" + tabla + "`");
      if (!filas.length) {
        console.log("  ", tabla.padEnd(22), "0");
        continue;
      }

      const columnas = Object.keys(filas[0]);
      const listaCols = columnas.map((c) => `"${c}"`).join(", ");

      for (let i = 0; i < filas.length; i += LOTE) {
        const lote = filas.slice(i, i + LOTE);
        const valores = [];
        const marcadores = lote.map((fila) => {
          const grupo = columnas.map((col) => {
            valores.push(normalizar(fila[col]));
            return `$${valores.length}`;
          });
          return `(${grupo.join(", ")})`;
        });
        await cliente.query(
          `INSERT INTO "${tabla}" (${listaCols}) VALUES ${marcadores.join(", ")}`,
          valores
        );
      }

      total += filas.length;
      console.log("  ", tabla.padEnd(22), filas.length);
    }

    // Reposicionar las secuencias de identity: se insertó con id explícito,
    // así que PostgreSQL no las avanzó. Sin esto, el primer alta de cliente o
    // producto choca contra la clave primaria.
    console.log("\nAjustando secuencias...");
    await resincronizarSecuencias(cliente);

    const rotas = await secuenciasDesincronizadas(cliente);
    if (rotas.length) {
      throw new Error("Quedaron secuencias desincronizadas: " + JSON.stringify(rotas));
    }

    await cliente.query("COMMIT");
    console.log(`\nMigración completada. Filas copiadas: ${total}`);
  } catch (err) {
    await cliente.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    cliente.release();
    await pg.end();
    await my.end();
  }
}

/** mysql2 devuelve Buffer para blob y string para fecha (dateStrings). */
function normalizar(valor) {
  if (valor === undefined) return null;
  if (Buffer.isBuffer(valor)) return valor;
  return valor;
}

main().catch((err) => {
  console.error("Error en la migración:", err.message);
  if (err.detail) console.error("Detalle:", err.detail);
  process.exit(1);
});
