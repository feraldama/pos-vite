const db = require("../config/db");

const Sucursal = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM Sucursal", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM Sucursal WHERE SucursalId = ?",
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  create: (sucursalData) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO Sucursal (SucursalNombre, SucursalDireccion, SucursalTelefono, SucursalEmail) VALUES (?, ?, ?, ?)`;
      db.query(
        query,
        [
          sucursalData.SucursalNombre,
          sucursalData.SucursalDireccion,
          sucursalData.SucursalTelefono,
          sucursalData.SucursalEmail,
        ],
        (err, result) => {
          if (err) return reject(err);
          Sucursal.getById(result.insertId)
            .then((sucursal) => resolve(sucursal))
            .catch((error) => reject(error));
        }
      );
    });
  },

  update: (id, sucursalData) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE Sucursal SET SucursalNombre = ?, SucursalDireccion = ?, SucursalTelefono = ?, SucursalEmail = ? WHERE SucursalId = ?`;
      db.query(
        query,
        [
          sucursalData.SucursalNombre,
          sucursalData.SucursalDireccion,
          sucursalData.SucursalTelefono,
          sucursalData.SucursalEmail,
          id,
        ],
        (err, result) => {
          if (err) return reject(err);
          if (result.affectedRows === 0) return resolve(null);
          Sucursal.getById(id)
            .then((sucursal) => resolve(sucursal))
            .catch((error) => reject(error));
        }
      );
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM Sucursal WHERE SucursalId = ?",
        [id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },

  getAllPaginated: (
    limit,
    offset,
    sortBy = "SucursalId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "SucursalId",
        "SucursalNombre",
        "SucursalDireccion",
        "SucursalTelefono",
        "SucursalEmail",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "SucursalId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      db.query(
        `SELECT * FROM Sucursal ORDER BY ${sortField} ${order} LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, results) => {
          if (err) return reject(err);

          db.query(
            "SELECT COUNT(*) as total FROM Sucursal",
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                sucursales: results,
                total: countResult[0].total,
              });
            }
          );
        }
      );
    });
  },

  searchSucursales: (
    term,
    limit,
    offset,
    sortBy = "SucursalId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "SucursalId",
        "SucursalNombre",
        "SucursalDireccion",
        "SucursalTelefono",
        "SucursalEmail",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "SucursalId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchQuery = `
        SELECT * FROM Sucursal
        WHERE SucursalNombre LIKE ? OR SucursalDireccion LIKE ? OR SucursalTelefono LIKE ? OR SucursalEmail LIKE ?
        ORDER BY ${sortField} ${order}
        LIMIT ? OFFSET ?
      `;
      const searchValue = `%${term}%`;

      db.query(
        searchQuery,
        [searchValue, searchValue, searchValue, searchValue, limit, offset],
        (err, results) => {
          if (err) return reject(err);

          const countQuery = `
            SELECT COUNT(*) as total FROM Sucursal
            WHERE SucursalNombre LIKE ? OR SucursalDireccion LIKE ? OR SucursalTelefono LIKE ? OR SucursalEmail LIKE ?
          `;
          db.query(
            countQuery,
            [searchValue, searchValue, searchValue, searchValue],
            (err, countResult) => {
              if (err) return reject(err);
              resolve({
                sucursales: results,
                total: countResult[0]?.total || 0,
              });
            }
          );
        }
      );
    });
  },
};

module.exports = Sucursal;
