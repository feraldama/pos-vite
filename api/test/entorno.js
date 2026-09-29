// Datos propios para los tests de integración: usuario, cliente, producto con
// stock conocido y caja. Todo se crea con un sufijo único y se borra en
// limpiar(), así los tests no dependen de los datos reales ni los tocan.
//
// Corren contra la base de .env (o la de TEST_DB_NAME si se define).
if (process.env.TEST_DB_NAME) process.env.DB_NAME = process.env.TEST_DB_NAME;

const { pool } = require("../config/db");

// Llama a un controlador de Express sin levantar el servidor
function llamar(controlador, req = {}) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      status(codigo) {
        this.statusCode = codigo;
        return this;
      },
      json(body) {
        resolve({ status: this.statusCode, body });
      },
    };
    controlador({ params: {}, query: {}, body: {}, ...req }, res);
  });
}

async function crearEntorno({ stock = 2 } = {}) {
  const sufijo = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const usuarioId = `t_${sufijo}`.slice(0, 25);
  const perfiles = [];

  await pool.query(
    `INSERT INTO usuario ("UsuarioId", "UsuarioIsAdmin") VALUES ($1, 'N')`,
    [usuarioId]
  );
  const clienteId = (
    await pool.query(
      `INSERT INTO clientes ("ClienteNombre", "ClienteApellido", "UsuarioId")
       VALUES ('TEST', $1, $2) RETURNING "ClienteId"`,
      [sufijo, usuarioId]
    )
  ).rows[0].ClienteId;
  const productoId = (
    await pool.query(
      `INSERT INTO producto ("ProductoNombre", "ProductoStock", "LocalId", "TipoPrendaId")
       VALUES ($1, $2, 0, NULL) RETURNING "ProductoId"`,
      [`TEST ${sufijo}`, stock]
    )
  ).rows[0].ProductoId;
  const cajaId = (
    await pool.query(
      `INSERT INTO caja ("CajaDescripcion") VALUES ($1) RETURNING "CajaId"`,
      [`TEST ${sufijo}`.slice(0, 30)]
    )
  ).rows[0].CajaId;

  // Alquiler base del entorno; cada test pisa lo que necesite
  const alquiler = (extra = {}) => ({
    ClienteId: clienteId,
    AlquilerFechaAlquiler: "2040-01-01",
    AlquilerFechaEntrega: "2040-01-05",
    AlquilerFechaDevolucion: "2040-01-08",
    AlquilerTotal: 100000,
    prendas: [{ ProductoId: productoId, AlquilerPrendasPrecio: 100000 }],
    ...extra,
  });

  // Perfil con permisos puntuales para el usuario del entorno
  async function darPermiso(menu, acciones) {
    const perfilId = (
      await pool.query(
        `INSERT INTO perfil ("PerfilDescripcion") VALUES ($1) RETURNING "PerfilId"`,
        [`TEST ${sufijo}`.slice(0, 30)]
      )
    ).rows[0].PerfilId;
    perfiles.push(perfilId);
    await pool.query(
      `INSERT INTO perfilmenu ("PerfilId", "MenuId", "puedeCrear", "puedeEditar", "puedeEliminar", "puedeLeer")
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        perfilId,
        menu,
        acciones.includes("crear") ? 1 : 0,
        acciones.includes("editar") ? 1 : 0,
        acciones.includes("eliminar") ? 1 : 0,
        acciones.includes("leer") ? 1 : 0,
      ]
    );
    await pool.query(
      `INSERT INTO usuarioperfil ("UsuarioId", "PerfilId") VALUES ($1, $2)`,
      [usuarioId, perfilId]
    );
  }

  async function limpiar() {
    const q = (sql, params) => pool.query(sql, params);
    const ids = (
      await q(`SELECT "AlquilerId" FROM alquiler WHERE "ClienteId" = $1`, [clienteId])
    ).rows.map((r) => r.AlquilerId);
    // alquilerpago se borra en cascada con el alquiler
    await q(`DELETE FROM alquilerprendas WHERE "AlquilerId" = ANY($1)`, [ids]);
    await q(`DELETE FROM alquiler WHERE "AlquilerId" = ANY($1)`, [ids]);
    await q(`DELETE FROM registrodiariocaja WHERE "CajaId" = $1`, [cajaId]);
    await q(`DELETE FROM producto WHERE "ProductoId" = $1`, [productoId]);
    await q(`DELETE FROM clientes WHERE "ClienteId" = $1`, [clienteId]);
    await q(`DELETE FROM caja WHERE "CajaId" = $1`, [cajaId]);
    await q(`DELETE FROM usuarioperfil WHERE "UsuarioId" = $1`, [usuarioId]);
    await q(`DELETE FROM perfilmenu WHERE "PerfilId" = ANY($1)`, [perfiles]);
    await q(`DELETE FROM perfil WHERE "PerfilId" = ANY($1)`, [perfiles]);
    await q(`DELETE FROM usuario WHERE "UsuarioId" = $1`, [usuarioId]);
  }

  return { usuarioId, clienteId, productoId, cajaId, alquiler, darPermiso, limpiar };
}

module.exports = { pool, llamar, crearEntorno };
