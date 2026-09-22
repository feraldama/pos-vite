/**
 * Crea (o recrea) la base de pruebas `<DB_NAME>_test` con el esquema de
 * db/postgres/01_schema.sql y un juego mínimo de datos.
 *
 *   node api/scripts/setup-test-db.cjs
 *
 * Los tests de integración corren contra esta base, nunca contra la real.
 */
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { Client } = require("pg");
const { resincronizarSecuencias, secuenciasDesincronizadas } = require("./lib/sequences.cjs");

const BASE_TEST = `${process.env.DB_NAME || "decorpar"}_test`;
const ESQUEMA = path.join(__dirname, "..", "..", "db", "postgres", "01_schema.sql");

const conexion = (database) => ({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  database,
});

// Datos mínimos para poder vender: un local, un almacén, una caja, un usuario,
// un cliente, los tipos de gasto que usa el POS y un producto.
const SEMILLA = `
INSERT INTO local ("LocalId","LocalNombre","LocalTelefono","LocalCelular","LocalDireccion")
  VALUES (2,'LAVADERO','','','');
INSERT INTO almacen ("AlmacenId","AlmacenNombre") VALUES (2,'LAVADERO');
INSERT INTO caja ("CajaId","CajaDescripcion","CajaMonto") VALUES (2,'CAJA LAVADERO',100000);
INSERT INTO usuario ("UsuarioId","UsuarioContrasena","UsuarioNombre","UsuarioApellido","UsuarioCorreo","UsuarioIsAdmin","UsuarioEstado","LocalId")
  VALUES ('lavadero','x','LAVADERO','','','N','A',2);
INSERT INTO clientes ("ClienteId","ClienteRUC","ClienteNombre","ClienteApellido","ClienteDireccion","ClienteTelefono","ClienteTipo","UsuarioId")
  VALUES (1,'','CLIENTE PRUEBA','','','','MI','lavadero');
INSERT INTO tipogasto ("TipoGastoId","TipoGastoDescripcion","TipoGastoCantGastos") VALUES (1,'EGRESOS',0),(2,'INGRESOS',0);
INSERT INTO tipogastogrupo ("TipoGastoId","TipoGastoGrupoId","TipoGastoGrupoDescripcion") VALUES
  (1,1,'COMPRA'),(1,2,'CIERRE DE CAJA'),
  (2,1,'VENTA'),(2,2,'APERTURA DE CAJA'),(2,3,'VENTA CREDITO'),
  (2,4,'VENTA POS'),(2,5,'VOUCHER'),(2,6,'TRANSFER');
INSERT INTO producto ("ProductoId","ProductoCodigo","ProductoNombre","ProductoPrecioVenta","ProductoPrecioVentaMayorista","ProductoPrecioUnitario","ProductoPrecioPromedio","ProductoStock","ProductoStockUnitario","ProductoCantidadCaja","ProductoIVA","ProductoStockMinimo","LocalId")
  VALUES (1,'SRV-1','SERVICIO DE PRUEBA',50000,50000,0,0,0,0,1,10,0,2);
-- Un movimiento histórico con el mismo texto que generaría la venta nro 1:
-- sirve para comprobar que anular la venta 1 no lo toca.
INSERT INTO registrodiariocaja ("RegistroDiarioCajaId","CajaId","RegistroDiarioCajaFecha","TipoGastoId","TipoGastoGrupoId","RegistroDiarioCajaDetalle","RegistroDiarioCajaMonto","UsuarioId","VentaId")
  VALUES (900,2,'2025-01-01',2,1,'Venta N°: 1',77777,'lavadero',NULL);
`;

async function main() {
  const admin = new Client(conexion("postgres"));
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS "${BASE_TEST}" WITH (FORCE)`);
  await admin.query(`CREATE DATABASE "${BASE_TEST}"`);
  await admin.end();
  console.log(`Base ${BASE_TEST} recreada.`);

  const test = new Client(conexion(BASE_TEST));
  await test.connect();
  await test.query(fs.readFileSync(ESQUEMA, "utf8"));
  console.log("Esquema cargado.");
  await test.query(SEMILLA);
  console.log("Datos de prueba cargados.");

  // La semilla inserta con ids explícitos, así que las secuencias quedaron
  // atrás. Sin esto, el primer POST de cliente/producto choca con la PK.
  await resincronizarSecuencias(test);
  const rotas = await secuenciasDesincronizadas(test);
  if (rotas.length) {
    console.error("Secuencias desincronizadas:", rotas);
    process.exitCode = 1;
  } else {
    console.log("Secuencias sincronizadas.");
  }
  await test.end();
}

main().catch((err) => {
  console.error("Error preparando la base de pruebas:", err.message);
  process.exit(1);
});
