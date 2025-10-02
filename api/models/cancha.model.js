const db = require("../config/db");

const Cancha = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM Cancha", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM Cancha WHERE CanchaId = ?",
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  create: (canchaData) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO Cancha (CanchaEstado, SucursalId, CanchaNombre) VALUES (?, ?, ?)`;
      // Convertir a booleano si viene como string
      const estado =
        canchaData.CanchaEstado === "true" || canchaData.CanchaEstado === true
          ? 1
          : 0;
      db.query(
        query,
        [estado, canchaData.SucursalId, canchaData.CanchaNombre],
        (err, result) => {
          if (err) return reject(err);
          Cancha.getById(result.insertId)
            .then((cancha) => resolve(cancha))
            .catch((error) => reject(error));
        }
      );
    });
  },

  update: (id, canchaData) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE Cancha SET CanchaEstado = ?, SucursalId = ?, CanchaNombre = ? WHERE CanchaId = ?`;
      // Convertir a booleano si viene como string
      const estado =
        canchaData.CanchaEstado === "true" || canchaData.CanchaEstado === true
          ? 1
          : 0;
      db.query(
        query,
        [estado, canchaData.SucursalId, canchaData.CanchaNombre, id],
        (err, result) => {
          if (err) return reject(err);
          if (result.affectedRows === 0) return resolve(null);
          Cancha.getById(id)
            .then((cancha) => resolve(cancha))
            .catch((error) => reject(error));
        }
      );
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query("DELETE FROM Cancha WHERE CanchaId = ?", [id], (err, result) => {
        if (err) return reject(err);
        resolve(result.affectedRows > 0);
      });
    });
  },

  getAllPaginated: (limit, offset, sortBy = "CanchaId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "CanchaId",
        "CanchaEstado",
        "SucursalId",
        "CanchaNombre",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "CanchaId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      db.query(
        `SELECT * FROM Cancha ORDER BY ${sortField} ${order} LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, results) => {
          if (err) return reject(err);

          db.query(
            "SELECT COUNT(*) as total FROM Cancha",
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                canchas: results,
                total: countResult[0].total,
              });
            }
          );
        }
      );
    });
  },

  searchCanchas: (
    term,
    limit,
    offset,
    sortBy = "CanchaId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "CanchaId",
        "CanchaEstado",
        "SucursalId",
        "CanchaNombre",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "CanchaId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchQuery = `
        SELECT * FROM Cancha
        WHERE CanchaNombre LIKE ? OR (CanchaEstado = 1 AND ? = 'activa') OR (CanchaEstado = 0 AND ? = 'inactiva')
        ORDER BY ${sortField} ${order}
        LIMIT ? OFFSET ?
      `;
      const searchValue = `%${term}%`;
      const termLower = term.toLowerCase();

      db.query(
        searchQuery,
        [searchValue, termLower, termLower, limit, offset],
        (err, results) => {
          if (err) return reject(err);

          const countQuery = `
            SELECT COUNT(*) as total FROM Cancha
            WHERE CanchaNombre LIKE ? OR (CanchaEstado = 1 AND ? = 'activa') OR (CanchaEstado = 0 AND ? = 'inactiva')
          `;
          db.query(
            countQuery,
            [searchValue, termLower, termLower],
            (err, countResult) => {
              if (err) return reject(err);
              resolve({
                canchas: results,
                total: countResult[0]?.total || 0,
              });
            }
          );
        }
      );
    });
  },
};

module.exports = Cancha;
