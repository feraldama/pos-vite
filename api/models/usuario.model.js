const db = require("../config/db");
const bcrypt = require("bcryptjs");

const Usuario = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM usuario", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM usuario WHERE UsuarioId = ?",
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  findByUsuarioId: (email) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM usuario WHERE UsuarioId = ? LIMIT 1",
        [email],
        (err, results) => {
          if (err) reject(err);
          resolve(results[0]);
        }
      );
    });
  },
  // getAllPaginated
  getAllPaginated: (limit, offset, sortBy = "UsuarioId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "UsuarioId",
        "UsuarioNombre",
        "UsuarioApellido",
        "UsuarioCorreo",
        "UsuarioIsAdmin",
        "UsuarioEstado",
        "LocalId",
        "LocalNombre",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "UsuarioId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const query = `
        SELECT u.*, l.LocalNombre
        FROM usuario u
        LEFT JOIN local l ON u.LocalId = l.LocalId
        ORDER BY u.${sortField} ${order}
        LIMIT ? OFFSET ?
      `;
      db.query(query, [limit, offset], (err, results) => {
        if (err) return reject(err);

        db.query(
          "SELECT COUNT(*) as total FROM usuario",
          (err, countResult) => {
            if (err) return reject(err);

            resolve({
              usuarios: results,
              total: countResult[0].total,
            });
          }
        );
      });
    });
  },

  // search
  search: (term, limit, offset, sortBy = "UsuarioId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "UsuarioId",
        "UsuarioNombre",
        "UsuarioApellido",
        "UsuarioCorreo",
        "UsuarioIsAdmin",
        "UsuarioEstado",
        "LocalId",
        "LocalNombre",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "UsuarioId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchQuery = `
        SELECT u.*, l.LocalNombre
        FROM usuario u
        LEFT JOIN local l ON u.LocalId = l.LocalId
        WHERE CONCAT(u.UsuarioNombre, ' ', u.UsuarioApellido) LIKE ?
        OR u.UsuarioCorreo LIKE ?
        OR u.UsuarioId LIKE ?
        OR l.LocalNombre LIKE ?
        ORDER BY u.${sortField} ${order}
        LIMIT ? OFFSET ?
      `;
      const searchValue = `%${term}%`;

      db.query(
        searchQuery,
        [searchValue, searchValue, searchValue, searchValue, limit, offset],
        (err, results) => {
          if (err) return reject(err);

          const countQuery = `
            SELECT COUNT(*) as total FROM usuario u
            LEFT JOIN local l ON u.LocalId = l.LocalId
            WHERE CONCAT(u.UsuarioNombre, ' ', u.UsuarioApellido) LIKE ?
            OR u.UsuarioCorreo LIKE ?
            OR u.UsuarioId LIKE ?
            OR l.LocalNombre LIKE ?
          `;

          db.query(
            countQuery,
            [searchValue, searchValue, searchValue, searchValue],
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                usuarios: results,
                total: countResult[0]?.total || 0,
              });
            }
          );
        }
      );
    });
  },

  create: (usuarioData) => {
    return new Promise(async (resolve, reject) => {
      const hashedPassword = await bcrypt.hash(
        usuarioData.UsuarioContrasena || "H4lc0n#05",
        10
      );
      const query = `
      INSERT INTO usuario (
        UsuarioId, 
        UsuarioNombre, 
        UsuarioApellido, 
        UsuarioCorreo, 
        UsuarioContrasena, 
        UsuarioIsAdmin, 
        UsuarioEstado, 
        LocalId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

      const values = [
        usuarioData.UsuarioId,
        usuarioData.UsuarioNombre,
        usuarioData.UsuarioApellido,
        usuarioData.UsuarioCorreo ?? "",
        usuarioData.UsuarioContrasena ? hashedPassword : hashedPassword,
        usuarioData.UsuarioIsAdmin,
        usuarioData.UsuarioEstado,
        usuarioData.LocalId,
      ];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        resolve({
          UsuarioId: usuarioData.UsuarioId,
          UsuarioNombre: usuarioData.UsuarioNombre,
          UsuarioApellido: usuarioData.UsuarioApellido,
          UsuarioCorreo: usuarioData.UsuarioCorreo ?? "",
          UsuarioIsAdmin: usuarioData.UsuarioIsAdmin,
          UsuarioEstado: usuarioData.UsuarioEstado,
          LocalId: usuarioData.LocalId,
        });
      });
    });
  },

  update: (id, usuarioData) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Asegurar que UsuarioCorreo nunca sea null ni undefined
        if (usuarioData.UsuarioCorreo == null) {
          usuarioData.UsuarioCorreo = "";
        }
        // Construir la consulta dinámicamente basada en los campos proporcionados
        let updateFields = [];
        let values = [];

        // Campos que pueden ser actualizados
        const camposActualizables = [
          "UsuarioNombre",
          "UsuarioApellido",
          "UsuarioCorreo",
          "UsuarioIsAdmin",
          "UsuarioEstado",
          "LocalId",
        ];

        // Si se proporciona una nueva contraseña y no está vacía, hashearla
        if (
          usuarioData.UsuarioContrasena &&
          usuarioData.UsuarioContrasena.trim() !== ""
        ) {
          const hashedPassword = await bcrypt.hash(
            usuarioData.UsuarioContrasena,
            10
          );
          camposActualizables.push("UsuarioContrasena");
          usuarioData.UsuarioContrasena = hashedPassword;
        }

        // Construir la consulta dinámicamente
        camposActualizables.forEach((campo) => {
          if (usuarioData[campo] !== undefined) {
            updateFields.push(`${campo} = ?`);
            values.push(usuarioData[campo]);
          }
        });

        if (updateFields.length === 0) {
          return resolve(null); // No hay campos para actualizar
        }

        // Agregar el ID al final de los valores
        values.push(id);

        const query = `
          UPDATE usuario 
          SET ${updateFields.join(", ")}
          WHERE UsuarioId = ?
        `;

        db.query(query, values, async (err, result) => {
          if (err) return reject(err);

          if (result.affectedRows === 0) {
            return resolve(null); // No se encontró el usuario
          }

          // Obtener el usuario actualizado
          const updatedUsuario = await Usuario.getById(id);
          resolve(updatedUsuario);
        });
      } catch (error) {
        reject(error);
      }
    });
  },
};

module.exports = Usuario;
