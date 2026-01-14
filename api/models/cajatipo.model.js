const db = require("../config/db");

const CajaTipo = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM CajaTipo", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM CajaTipo WHERE CajaTipoId = ?",
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  create: (cajaTipoData) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO CajaTipo (CajaTipoDescripcion) VALUES (?)`;
      const values = [cajaTipoData.CajaTipoDescripcion];
      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        // Obtener el tipo de caja recién creado
        CajaTipo.getById(result.insertId)
          .then((cajaTipo) => resolve(cajaTipo))
          .catch((error) => reject(error));
      });
    });
  },

  update: (id, cajaTipoData) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE CajaTipo SET CajaTipoDescripcion = ? WHERE CajaTipoId = ?`;
      const values = [cajaTipoData.CajaTipoDescripcion, id];
      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) return resolve(null);
        CajaTipo.getById(id)
          .then((cajaTipo) => resolve(cajaTipo))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query("DELETE FROM CajaTipo WHERE CajaTipoId = ?", [id], (err, result) => {
        if (err) return reject(err);
        resolve(result.affectedRows > 0);
      });
    });
  },

  getAllPaginated: (limit, offset, sortBy = "CajaTipoId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = ["CajaTipoId", "CajaTipoDescripcion"];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "CajaTipoId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      db.query(
        `SELECT * FROM CajaTipo ORDER BY ${sortField} ${order} LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, results) => {
          if (err) return reject(err);

          db.query("SELECT COUNT(*) as total FROM CajaTipo", (err, countResult) => {
            if (err) return reject(err);

            resolve({
              cajaTipos: results,
              total: countResult[0].total,
            });
          });
        }
      );
    });
  },

  searchCajaTipos: (
    term,
    limit,
    offset,
    sortBy = "CajaTipoId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = ["CajaTipoId", "CajaTipoDescripcion"];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "CajaTipoId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchQuery = `
        SELECT * FROM CajaTipo
        WHERE CajaTipoDescripcion LIKE ?
        ORDER BY ${sortField} ${order}
        LIMIT ? OFFSET ?
      `;
      const searchValue = `%${term}%`;

      db.query(
        searchQuery,
        [searchValue, limit, offset],
        (err, results) => {
          if (err) return reject(err);

          const countQuery = `
            SELECT COUNT(*) as total FROM CajaTipo
            WHERE CajaTipoDescripcion LIKE ?
          `;
          db.query(countQuery, [searchValue], (err, countResult) => {
            if (err) return reject(err);
            resolve({
              cajaTipos: results,
              total: countResult[0]?.total || 0,
            });
          });
        }
      );
    });
  },
};

module.exports = CajaTipo;
