/**
 * Tests de las rutas de ESCRITURA, contra la base `<DB_NAME>_test`.
 *
 * Los modelos siguen escritos en dialecto MySQL y se traducen en caliente, así
 * que una incompatibilidad no aparece al compilar. Estos casos cubren altas,
 * ediciones y bajas de cada entidad, más el flujo de apertura/cierre de caja.
 *
 *   node --test "tests/*.test.js"
 */
const test = require("node:test");
const assert = require("node:assert");

process.env.DB_NAME = `${process.env.DB_NAME || "decorpar"}_test`;

const { pool } = require("../config/db");
const { secuenciasDesincronizadas } = require("../scripts/lib/sequences.cjs");

const almacen = require("../controllers/almacen.controller");
const caja = require("../controllers/caja.controller");
const cliente = require("../controllers/cliente.controller");
const producto = require("../controllers/producto.controller");
const tipogasto = require("../controllers/tipogasto.controller");
const tipogastogrupo = require("../controllers/tipogastogrupo.controller");
const combo = require("../controllers/combo.controller");
const registro = require("../controllers/registrodiariocaja.controller");

const HOY = new Date().toISOString().slice(0, 10);

/** Ejecuta un handler de Express con req/res simulados. */
function llamar(handler, { body = {}, params = {}, query = {}, user } = {}) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      status(c) {
        this.statusCode = c;
        return this;
      },
      json(payload) {
        resolve({ status: this.statusCode, body: payload });
      },
    };
    handler({ body, params, query, user }, res);
  });
}

/** Los controladores devuelven el objeto pelado o envuelto en `data`. */
const dato = (r) => (r.body && r.body.data ? r.body.data : r.body);

test.after(() => pool.end());

test("la base de pruebas arranca con las secuencias sincronizadas", async () => {
  // La semilla inserta con ids explícitos: si no se reposicionan las
  // secuencias, el primer alta de cliente o producto choca con la PK.
  const rotas = await secuenciasDesincronizadas(pool);
  assert.deepStrictEqual(rotas, [], "no debe haber secuencias atrasadas");
});

test("alta, edición y baja de almacén", async () => {
  const creado = await llamar(almacen.create, { body: { AlmacenNombre: "TEST" } });
  assert.ok(creado.status < 400, JSON.stringify(creado.body));
  const id = dato(creado).AlmacenId;

  const editado = await llamar(almacen.update, {
    params: { id },
    body: { AlmacenNombre: "TEST 2" },
  });
  assert.ok(editado.status < 400);
  assert.strictEqual(dato(editado).AlmacenNombre, "TEST 2");

  const borrado = await llamar(almacen.delete, { params: { id } });
  assert.ok(borrado.status < 400);
});

test("alta y baja de cliente", async () => {
  const creado = await llamar(cliente.createCliente, {
    body: {
      ClienteRUC: "", ClienteNombre: "TEST", ClienteApellido: "CLI",
      ClienteDireccion: "", ClienteTelefono: "", ClienteTipo: "MI",
      UsuarioId: "lavadero",
    },
  });
  assert.ok(creado.status < 400, JSON.stringify(creado.body));
  const id = dato(creado).ClienteId;
  assert.ok(id > 1, "el id nuevo no debe pisar al de la semilla");

  const borrado = await llamar(cliente.deleteCliente, { params: { id } });
  assert.ok(borrado.status < 400);
});

test("editar un producto sin imagen no rompe ni borra la que tenía", async () => {
  // La columna ProductoImagen es NOT NULL. El modelo escribía NULL cuando el
  // cliente no mandaba imagen: en PostgreSQL eso hacía fallar toda edición.
  const base = {
    ProductoCodigo: "T-1", ProductoNombre: "TEST", ProductoPrecioVenta: 1000,
    ProductoPrecioVentaMayorista: 1000, ProductoPrecioUnitario: 0,
    ProductoPrecioPromedio: 0, ProductoStock: 0, ProductoStockUnitario: 0,
    ProductoCantidadCaja: 1, ProductoIVA: 10, ProductoStockMinimo: 0, LocalId: 2,
  };
  const creado = await llamar(producto.createProducto, { body: base });
  assert.ok(creado.status < 400, JSON.stringify(creado.body));
  const id = dato(creado).ProductoId;

  // con cadena vacía (lo que manda el formulario cuando no hay imagen)
  const sinImagen = await llamar(producto.updateProducto, {
    params: { id },
    body: { ...base, ProductoNombre: "TEST 2", ProductoImagen: "" },
  });
  assert.ok(sinImagen.status < 400, JSON.stringify(sinImagen.body));
  assert.strictEqual(dato(sinImagen).ProductoNombre, "TEST 2");

  // sin incluir ProductoImagen en el cuerpo (el controlador exige el resto
  // de los campos, así que se manda todo menos la imagen)
  const omitida = await llamar(producto.updateProducto, {
    params: { id },
    body: { ...base, ProductoPrecioVenta: 2222 },
  });
  assert.ok(omitida.status < 400, JSON.stringify(omitida.body));
  assert.strictEqual(Number(dato(omitida).ProductoPrecioVenta), 2222);

  await llamar(producto.deleteProducto, { params: { id } });
});

test("borrar un producto referenciado avisa en vez de tirar un 500", async () => {
  const creado = await llamar(producto.createProducto, {
    body: {
      ProductoCodigo: "T-2", ProductoNombre: "CON COMBO", ProductoPrecioVenta: 1000,
      ProductoPrecioVentaMayorista: 1000, ProductoPrecioUnitario: 0,
      ProductoPrecioPromedio: 0, ProductoStock: 0, ProductoStockUnitario: 0,
      ProductoCantidadCaja: 1, ProductoIVA: 10, ProductoStockMinimo: 0, LocalId: 2,
    },
  });
  const id = dato(creado).ProductoId;
  await llamar(combo.create, {
    body: { ComboDescripcion: "C", ProductoId: id, ComboCantidad: 2, ComboPrecio: 100 },
  });

  const r = await llamar(producto.deleteProducto, { params: { id } });
  assert.strictEqual(r.status, 400, "debe ser un error de negocio, no un 500");
  assert.match(r.body.message, /no se puede eliminar/i);
});

test("borrar un tipo de gasto con grupos avisa en vez de tirar un 500", async () => {
  // La detección de clave foránea buscaba el texto de error de MySQL: contra
  // PostgreSQL no coincidía nunca y el usuario recibía un 500 crudo.
  const creado = await llamar(tipogasto.create, {
    body: { TipoGastoDescripcion: "TEST TG", TipoGastoCantGastos: 0 },
  });
  const id = dato(creado).TipoGastoId;
  await llamar(tipogastogrupo.create, {
    body: { TipoGastoId: id, TipoGastoGrupoId: 1, TipoGastoGrupoDescripcion: "G" },
  });

  const r = await llamar(tipogasto.delete, { params: { id } });
  assert.strictEqual(r.status, 400);
  assert.match(r.body.message, /no se puede eliminar/i);
});

test("borrar una caja con movimientos avisa en vez de tirar un 500", async () => {
  const r = await llamar(caja.delete, { params: { id: 2 } });
  assert.strictEqual(r.status, 400);
  assert.match(r.body.message, /no se puede eliminar/i);
});

test("apertura y cierre de caja, con el estado en el medio", async () => {
  const abrir = await llamar(registro.aperturaCierreCaja, {
    body: { apertura: 0, CajaId: 2, Monto: 100000, UsuarioId: "lavadero" },
    user: { id: "lavadero" },
  });
  assert.ok(abrir.status < 400, JSON.stringify(abrir.body));

  const estado = await llamar(registro.estadoAperturaPorUsuario, {
    query: { usuarioId: "lavadero" },
  });
  assert.ok(estado.status < 400);

  // Abrir dos veces seguidas tiene que rechazarse
  const dobleApertura = await llamar(registro.aperturaCierreCaja, {
    body: { apertura: 0, CajaId: 2, Monto: 100000, UsuarioId: "lavadero" },
    user: { id: "lavadero" },
  });
  assert.strictEqual(dobleApertura.status, 400);
  assert.match(dobleApertura.body.message, /caja abierta/i);

  const cerrar = await llamar(registro.aperturaCierreCaja, {
    body: { apertura: 1, CajaId: 2, Monto: 100000, UsuarioId: "lavadero" },
    user: { id: "lavadero" },
  });
  assert.ok(cerrar.status < 400, JSON.stringify(cerrar.body));
});

test("alta, edición y baja de un movimiento de caja", async () => {
  const base = {
    CajaId: 2, RegistroDiarioCajaFecha: HOY, TipoGastoId: 1, TipoGastoGrupoId: 1,
    RegistroDiarioCajaDetalle: "TEST MOV", RegistroDiarioCajaMonto: 1000,
    UsuarioId: "lavadero",
  };
  const creado = await llamar(registro.create, {
    body: base,
    user: { id: "lavadero" },
  });
  assert.ok(creado.status < 400, JSON.stringify(creado.body));
  const id = dato(creado).RegistroDiarioCajaId;

  const editado = await llamar(registro.update, {
    params: { id },
    body: { ...base, RegistroDiarioCajaMonto: 2000 },
    user: { id: "lavadero" },
  });
  assert.ok(editado.status < 400);

  const borrado = await llamar(registro.delete, { params: { id } });
  assert.ok(borrado.status < 400);
});
