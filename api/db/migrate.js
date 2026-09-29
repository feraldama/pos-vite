// Aplica en orden los .sql de db/migrations que todavía no se corrieron y los
// registra en schema_migrations. Corre al arrancar la API (index.js) y a mano
// con `npm run migrate`.
//
// - Cada migración va en su propia transacción: si falla, no queda a medias ni
//   se registra, y las siguientes no se aplican.
// - Un advisory lock evita que dos instancias de la API migren a la vez.
// - Los archivos se escriben en SQL de PostgreSQL (con comillas en los
//   nombres); no pasan por la traducción estilo MySQL de config/db.
// - Una migración ya registrada no se vuelve a correr aunque cambie el archivo:
//   para corregirla se agrega otra nueva.
const fs = require("fs");
const path = require("path");
const { pool } = require("../config/db");

const DIR = path.join(__dirname, "migrations");
// Clave arbitraria y fija para pg_advisory_lock
const LOCK_ID = 7254001;

async function aplicarMigraciones({ log = console.log } = {}) {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        nombre varchar(255) PRIMARY KEY,
        aplicada_en timestamptz NOT NULL DEFAULT now()
      )`);

    const { rows } = await client.query("SELECT nombre FROM schema_migrations");
    const aplicadas = new Set(rows.map((r) => r.nombre));
    const pendientes = fs
      .readdirSync(DIR)
      .filter((f) => f.endsWith(".sql") && !aplicadas.has(f))
      .sort();

    for (const archivo of pendientes) {
      const sql = fs.readFileSync(path.join(DIR, archivo), "utf8");
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (nombre) VALUES ($1)", [
          archivo,
        ]);
        await client.query("COMMIT");
        log(`Migración aplicada: ${archivo}`);
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        error.message = `Migración ${archivo}: ${error.message}`;
        throw error;
      }
    }
    return pendientes;
  } finally {
    await client
      .query("SELECT pg_advisory_unlock($1)", [LOCK_ID])
      .catch(() => {});
    client.release();
  }
}

module.exports = { aplicarMigraciones };

// Uso directo: node db/migrate.js
if (require.main === module) {
  aplicarMigraciones()
    .then((aplicadas) => {
      if (aplicadas.length === 0) console.log("No hay migraciones pendientes");
      return pool.end();
    })
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}
