const db = require("../config/db");

const Caja = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM Caja", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM Caja WHERE CajaId = ?", [id], (err, results) => {
        if (err) return reject(err);
        resolve(results.length > 0 ? results[0] : null);
      });
    });
  },

  create: (cajaData) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO Caja (CajaDescripcion, CajaMonto, CajaGastoCantidad) VALUES (?, ?, ?)`;
      const values = [
        cajaData.CajaDescripcion,
        cajaData.CajaMonto,
        cajaData.CajaGastoCantidad,
      ];
      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        // Obtener la caja recién creada
        Caja.getById(result.insertId)
          .then((caja) => resolve(caja))
          .catch((error) => reject(error));
      });
    });
  },

  update: (id, cajaData) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE Caja SET CajaDescripcion = ?, CajaMonto = ?, CajaGastoCantidad = ? WHERE CajaId = ?`;
      const values = [
        cajaData.CajaDescripcion,
        cajaData.CajaMonto,
        cajaData.CajaGastoCantidad,
        id,
      ];
      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) return resolve(null);
        Caja.getById(id)
          .then((caja) => resolve(caja))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query("DELETE FROM Caja WHERE CajaId = ?", [id], (err, result) => {
        if (err) return reject(err);
        resolve(result.affectedRows > 0);
      });
    });
  },

  getAllPaginated: (limit, offset, sortBy = "CajaId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "CajaId",
        "CajaDescripcion",
        "CajaMonto",
        "CajaGastoCantidad",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : "CajaId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      db.query(
        `SELECT * FROM Caja ORDER BY ${sortField} ${order} LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, results) => {
          if (err) return reject(err);

          db.query("SELECT COUNT(*) as total FROM Caja", (err, countResult) => {
            if (err) return reject(err);

            resolve({
              cajas: results,
              total: countResult[0].total,
            });
          });
        }
      );
    });
  },

  searchCajas: (term, limit, offset, sortBy = "CajaId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "CajaId",
        "CajaDescripcion",
        "CajaMonto",
        "CajaGastoCantidad",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : "CajaId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchQuery = `
        SELECT * FROM Caja
        WHERE CajaDescripcion LIKE ?
        OR CAST(CajaMonto AS CHAR) LIKE ?
        OR CAST(CajaGastoCantidad AS CHAR) LIKE ?
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
            SELECT COUNT(*) as total FROM Caja
            WHERE CajaDescripcion LIKE ?
            OR CAST(CajaMonto AS CHAR) LIKE ?
            OR CAST(CajaGastoCantidad AS CHAR) LIKE ?
          `;
          db.query(
            countQuery,
            [searchValue, searchValue, searchValue],
            (err, countResult) => {
              if (err) return reject(err);
              resolve({
                cajas: results,
                total: countResult[0]?.total || 0,
              });
            }
          );
        }
      );
    });
  },
};

module.exports = Caja;
