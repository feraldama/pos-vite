/**
 * Recorre todos los endpoints de lectura de la API y reporta cuáles fallan.
 * Solo hace GET: no modifica datos.
 *
 *   node api/scripts/smoke-test.cjs            (contra localhost:3001)
 *   API_URL=http://otro-host:3001/api node api/scripts/smoke-test.cjs
 *
 * Pensado para correr después de tocar la capa de datos. La API traduce SQL de
 * dialecto MySQL a PostgreSQL en caliente (ver api/config/db.js), así que una
 * consulta incompatible no falla al compilar: revienta recién en producción.
 * Este script es la red que atrapa eso.
 *
 * Sale con código 1 si algún endpoint responde 4xx/5xx.
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const jwt = require("jsonwebtoken");

const BASE = process.env.API_URL || "http://localhost:3001/api";
const TOKEN = jwt.sign({ id: "lavadero", LocalId: 2 }, process.env.JWT_SECRET, {
  expiresIn: "30m",
});
const HOY = new Date().toISOString().slice(0, 10);

const RUTAS = [
  ["/almacen", "listado"],
  ["/almacen/search?q=lav", "busqueda"],
  ["/almacen/1", "por id"],
  ["/caja", "listado"],
  ["/caja/search?q=caja", "busqueda"],
  ["/caja/1", "por id"],
  ["/clientes", "listado"],
  ["/clientes/search?q=sin", "busqueda"],
  ["/clientes/1", "por id"],
  ["/combo", "listado"],
  ["/combo/paginated?page=1&limit=5", "paginado"],
  ["/combo/search?q=a", "busqueda"],
  ["/locales", "listado"],
  ["/locales/search?q=lav", "busqueda"],
  ["/locales/1", "por id"],
  ["/menus", "listado"],
  ["/perfiles", "listado"],
  ["/productos?page=1&limit=5", "listado paginado"],
  ["/productos/all", "sin paginar"],
  ["/productos/search?q=lavado", "busqueda"],
  ["/productos/export", "export excel"],
  ["/productos/1", "por id"],
  ["/registrodiariocaja?page=1&limit=5", "listado"],
  ["/registrodiariocaja/search?q=apertura", "busqueda"],
  [`/registrodiariocaja/rango?fechaDesde=2025-01-01&fechaHasta=${HOY}`, "por rango"],
  ["/tipogasto", "listado"],
  ["/tipogasto/paginated?page=1&limit=5", "paginado"],
  ["/tipogasto/search?q=egreso", "busqueda"],
  ["/tipogastogrupo", "listado"],
  ["/usuarios", "listado"],
  ["/usuarios/search?q=lav", "busqueda"],
  ["/venta", "listado"],
  ["/venta/paginated?page=1&limit=5", "paginado"],
  ["/venta/search?q=1", "busqueda"],
  ["/venta/pendientes", "deudas por cliente"],
  ["/venta/pendientes/1", "pendientes de un cliente"],
  ["/ventacredito", "listado"],
  ["/ventacreditopago", "listado"],
  ["/ventaproducto", "listado"],
];

(async () => {
  const fallos = [];

  for (const [ruta, desc] of RUTAS) {
    let estado = "ERR";
    let detalle = "";
    try {
      const r = await fetch(BASE + ruta, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      });
      estado = r.status;
      if (r.status >= 400) {
        detalle = (await r.text()).slice(0, 200);
        fallos.push({ ruta, desc, estado, detalle });
      }
    } catch (e) {
      detalle = e.message;
      fallos.push({ ruta, desc, estado, detalle });
    }
    console.log(
      `${estado === 200 ? "ok   " : "FALLA"} ${String(estado).padStart(3)}  ${ruta.padEnd(
        52
      )} ${desc}`
    );
  }

  console.log(`\n${RUTAS.length - fallos.length}/${RUTAS.length} endpoints OK`);

  if (fallos.length) {
    console.log("\n=== FALLAS ===");
    fallos.forEach((f) =>
      console.log(`\n${f.ruta}  (${f.desc})  -> ${f.estado}\n   ${f.detalle}`)
    );
    process.exit(1);
  }
})();
