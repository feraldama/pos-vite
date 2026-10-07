const db = require("../config/db");

// pg entrega las columnas date como Date a medianoche local; al pasar a JSON
// se convertirían a UTC y el cumpleaños podría correrse un día. Se devuelven
// como texto AAAA-MM-DD.
const pad = (n) => String(n).padStart(2, "0");
const fechaTexto = (f) =>
  f instanceof Date
    ? `${f.getFullYear()}-${pad(f.getMonth() + 1)}-${pad(f.getDate())}`
    : f ?? null;
const normalizar = (c) =>
  c ? { ...c, ClienteFechaNacimiento: fechaTexto(c.ClienteFechaNacimiento) } : c;

// "" o fecha inválida -> null
const fechaONull = (f) => (/^\d{4}-\d{2}-\d{2}$/.test(f || "") ? f : null);

const Cliente = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM clientes", (err, results) => {
        if (err) return reject(err);
        resolve(results.map(normalizar));
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM clientes WHERE ClienteId = ?",
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? normalizar(results[0]) : null);
        }
      );
    });
  },

  getAllPaginated: (limit, offset, sortBy = "ClienteId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "ClienteId",
        "ClienteRUC",
        "ClienteNombre",
        "ClienteApellido",
        "ClienteDireccion",
        "ClienteTelefono",
        "ClienteTipo",
        "UsuarioId",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "ClienteId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      db.query(
        `SELECT * FROM clientes ORDER BY ${sortField} ${order} LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, results) => {
          if (err) return reject(err);

          db.query(
            "SELECT COUNT(*) as total FROM clientes",
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                clientes: results.map(normalizar),
                total: countResult[0].total,
              });
            }
          );
        }
      );
    });
  },

  search: (term, limit, offset, sortBy = "ClienteId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "ClienteId",
        "ClienteRUC",
        "ClienteNombre",
        "ClienteApellido",
        "ClienteDireccion",
        "ClienteTelefono",
        "ClienteTipo",
        "UsuarioId",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "ClienteId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchQuery = `
        SELECT * FROM clientes 
        WHERE CONCAT(ClienteNombre, ' ', ClienteApellido) LIKE ? 
        OR ClienteRUC LIKE ? 
        OR ClienteId LIKE ?
        ORDER BY ${sortField} ${order}
        LIMIT ? OFFSET ?
      `;
      const searchValue = `%${term}%`;

      db.query(
        searchQuery,
        [searchValue, searchValue, searchValue, limit, offset],
        (err, results) => {
          if (err) return reject(err);

          const countQuery = `
            SELECT COUNT(*) as total FROM clientes 
            WHERE CONCAT(ClienteNombre, ' ', ClienteApellido) LIKE ? 
            OR ClienteRUC LIKE ? 
            OR ClienteId LIKE ?
          `;

          db.query(
            countQuery,
            [searchValue, searchValue, searchValue],
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                clientes: results.map(normalizar),
                total: countResult[0]?.total || 0,
              });
            }
          );
        }
      );
    });
  },

  create: (clienteData) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO clientes (
          ClienteRUC,
          ClienteNombre,
          ClienteApellido,
          ClienteDireccion,
          ClienteTelefono,
          ClienteTipo,
          UsuarioId,
          ClienteFechaNacimiento,
          ClienteVehiculo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
        clienteData.ClienteRUC || "",
        clienteData.ClienteNombre,
        clienteData.ClienteApellido || "",
        clienteData.ClienteDireccion || "",
        clienteData.ClienteTelefono || "",
        clienteData.ClienteTipo || "",
        clienteData.UsuarioId || "",
        fechaONull(clienteData.ClienteFechaNacimiento),
        (clienteData.ClienteVehiculo || "").slice(0, 60),
      ];
      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        resolve({
          ...clienteData,
          ClienteFechaNacimiento: fechaONull(clienteData.ClienteFechaNacimiento),
          ClienteId: result.insertId,
        });
      });
    });
  },

  update: (id, clienteData) => {
    return new Promise((resolve, reject) => {
      let updateFields = [];
      let values = [];
      const camposActualizables = [
        "ClienteRUC",
        "ClienteNombre",
        "ClienteApellido",
        "ClienteDireccion",
        "ClienteTelefono",
        "ClienteTipo",
        "UsuarioId",
        "ClienteVehiculo",
      ];
      camposActualizables.forEach((campo) => {
        if (clienteData[campo] !== undefined) {
          updateFields.push(`${campo} = ?`);
          values.push(clienteData[campo]);
        }
      });
      if (clienteData.ClienteFechaNacimiento !== undefined) {
        updateFields.push("ClienteFechaNacimiento = ?");
        values.push(fechaONull(clienteData.ClienteFechaNacimiento));
      }
      if (updateFields.length === 0) {
        return resolve(null);
      }
      values.push(id);
      const query = `
        UPDATE clientes 
        SET ${updateFields.join(", ")}
        WHERE ClienteId = ?
      `;
      db.query(query, values, async (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) {
          return resolve(null);
        }
        db.query(
          "SELECT * FROM clientes WHERE ClienteId = ?",
          [id],
          (err, results) => {
            if (err) return reject(err);
            resolve(results.length > 0 ? normalizar(results[0]) : null);
          }
        );
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM clientes WHERE ClienteId = ?",
        [id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },
};

module.exports = Cliente;
