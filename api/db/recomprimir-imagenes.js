// Recomprime las fotos de productos ya guardadas: JPEG de hasta 1600 px por
// lado (mismo criterio que al subir una foto nueva). Las originales de
// celular pesan varios MB y hacen pesados la base y los backups.
//
// Uso:
//   npm run imagenes:recomprimir             -> simula y muestra el ahorro
//   npm run imagenes:recomprimir -- --aplicar             -> graba los cambios
//   npm run imagenes:recomprimir -- --aplicar --vacuum    -> y libera el espacio
//
// - Es irreversible: las fotos originales se reemplazan. Hacer un backup antes
//   en producción.
// - Solo reemplaza si el resultado ahorra al menos un 10%; correrlo dos veces
//   no vuelve a degradar las fotos ya optimizadas.
// - Procesa de a un producto para no cargar cientos de MB en memoria.
// - --vacuum corre VACUUM FULL producto, que bloquea la tabla mientras dura:
//   en producción, fuera del horario de atención.
// - Si la API está corriendo, reiniciarla después: guarda miniaturas en
//   memoria generadas desde las fotos viejas.
const { pool } = require("../config/db");
const { optimizarImagen } = require("../utils/optimizarImagen");

const AHORRO_MINIMO = 0.1;

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

async function tamanoTabla() {
  const { rows } = await pool.query(
    "SELECT pg_total_relation_size('producto') AS bytes"
  );
  return Number(rows[0].bytes);
}

async function recomprimir({ aplicar = false, vacuum = false, log = console.log } = {}) {
  const { rows: productos } = await pool.query(
    `SELECT "ProductoId" FROM producto
     WHERE octet_length("ProductoImagen") > 0
     ORDER BY "ProductoId"`
  );
  log(
    `${productos.length} productos con foto. Tabla producto: ${mb(await tamanoTabla())}` +
      (aplicar ? "" : " (simulación: no se graba nada; usar --aplicar)")
  );

  let antes = 0;
  let despues = 0;
  let cambiadas = 0;
  for (const [i, { ProductoId }] of productos.entries()) {
    const { rows } = await pool.query(
      `SELECT "ProductoImagen" FROM producto WHERE "ProductoId" = $1`,
      [ProductoId]
    );
    const original = rows[0]?.ProductoImagen;
    if (!original?.length) continue;

    const optimizada = await optimizarImagen(original);
    antes += original.length;
    if (optimizada.length <= original.length * (1 - AHORRO_MINIMO)) {
      despues += optimizada.length;
      cambiadas++;
      if (aplicar) {
        await pool.query(
          `UPDATE producto SET "ProductoImagen" = $1 WHERE "ProductoId" = $2`,
          [optimizada, ProductoId]
        );
      }
    } else {
      despues += original.length;
    }
    if ((i + 1) % 25 === 0) log(`  ${i + 1}/${productos.length}...`);
  }

  log(
    `Fotos: ${mb(antes)} -> ${mb(despues)} ` +
      `(${cambiadas} recomprimidas, ${productos.length - cambiadas} sin cambios)`
  );

  if (aplicar && vacuum) {
    log("Liberando espacio (VACUUM FULL producto)...");
    await pool.query("VACUUM FULL producto");
  }
  if (aplicar) log(`Tabla producto: ${mb(await tamanoTabla())}`);
  return { total: productos.length, cambiadas, antes, despues };
}

module.exports = { recomprimir };

if (require.main === module) {
  const args = process.argv.slice(2);
  recomprimir({ aplicar: args.includes("--aplicar"), vacuum: args.includes("--vacuum") })
    .then(() => pool.end())
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}
