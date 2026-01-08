const db = require("../config/db");

const AlquilerPrendas = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM alquilerprendas", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (alquilerId, alquilerPrendasId) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM alquilerprendas WHERE AlquilerId = ? AND AlquilerPrendasId = ?",
        [alquilerId, alquilerPrendasId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  getByAlquilerId: (alquilerId) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          ap.*,
          p.ProductoNombre,
          p.ProductoCodigo,
          p.ProductoPrecioVenta,
          tp.TipoPrendaNombre
        FROM alquilerprendas ap
        LEFT JOIN producto p ON ap.ProductoId = p.ProductoId
        LEFT JOIN tipoprenda tp ON p.TipoPrendaId = tp.TipoPrendaId
        WHERE ap.AlquilerId = ?
      `;

      db.query(query, [alquilerId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  },

  create: (data) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO alquilerprendas (
        AlquilerId,
        AlquilerPrendasId,
        ProductoId,
        AlquilerPrendasPrecio
      ) VALUES (?, ?, ?, ?)`;

      const values = [
        data.AlquilerId,
        data.AlquilerPrendasId,
        data.ProductoId,
        data.AlquilerPrendasPrecio,
      ];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        AlquilerPrendas.getById(data.AlquilerId, data.AlquilerPrendasId)
          .then((alquilerPrendas) => resolve(alquilerPrendas))
          .catch((error) => reject(error));
      });
    });
  },

  update: (alquilerId, alquilerPrendasId, data) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE alquilerprendas SET 
        ProductoId = ?,
        AlquilerPrendasPrecio = ?
        WHERE AlquilerId = ? AND AlquilerPrendasId = ?`;

      const values = [
        data.ProductoId,
        data.AlquilerPrendasPrecio,
        alquilerId,
        alquilerPrendasId,
      ];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) return resolve(null);
        AlquilerPrendas.getById(alquilerId, alquilerPrendasId)
          .then((alquilerPrendas) => resolve(alquilerPrendas))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (alquilerId, alquilerPrendasId) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM alquilerprendas WHERE AlquilerId = ? AND AlquilerPrendasId = ?",
        [alquilerId, alquilerPrendasId],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },

  deleteByAlquilerId: (alquilerId) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM alquilerprendas WHERE AlquilerId = ?",
        [alquilerId],
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
    sortBy = "AlquilerId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "AlquilerId",
        "AlquilerPrendasId",
        "ProductoId",
        "AlquilerPrendasPrecio",
      ];

      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "AlquilerId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      db.query(
        `SELECT * FROM alquilerprendas ORDER BY ${sortField} ${order} LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, results) => {
          if (err) return reject(err);

          db.query(
            "SELECT COUNT(*) as total FROM alquilerprendas",
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                alquilerPrendas: results,
                total: countResult[0].total,
              });
            }
          );
        }
      );
    });
  },

  search: (term, limit, offset, sortBy = "AlquilerId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "AlquilerId",
        "AlquilerPrendasId",
        "ProductoId",
        "AlquilerPrendasPrecio",
      ];

      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "AlquilerId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchQuery = `
        SELECT ap.*, p.ProductoNombre, p.ProductoCodigo
        FROM alquilerprendas ap
        LEFT JOIN producto p ON ap.ProductoId = p.ProductoId
        WHERE CAST(ap.AlquilerId AS CHAR) = ?
        OR CAST(ap.AlquilerPrendasId AS CHAR) = ?
        OR CAST(ap.ProductoId AS CHAR) = ?
        OR CAST(ap.AlquilerPrendasPrecio AS CHAR) = ?
        OR p.ProductoNombre LIKE ?
        OR p.ProductoCodigo LIKE ?
        ORDER BY ap.${sortField} ${order}
        LIMIT ? OFFSET ?
      `;

      const exactValue = term;
      const likeValue = `%${term}%`;
      const values = [
        exactValue,
        exactValue,
        exactValue,
        exactValue,
        likeValue,
        likeValue,
        limit,
        offset,
      ];

      db.query(searchQuery, values, (err, results) => {
        if (err) return reject(err);

        const countQuery = `
          SELECT COUNT(*) as total
          FROM alquilerprendas ap
          LEFT JOIN producto p ON ap.ProductoId = p.ProductoId
          WHERE CAST(ap.AlquilerId AS CHAR) = ?
          OR CAST(ap.AlquilerPrendasId AS CHAR) = ?
          OR CAST(ap.ProductoId AS CHAR) = ?
          OR CAST(ap.AlquilerPrendasPrecio AS CHAR) = ?
          OR p.ProductoNombre LIKE ?
          OR p.ProductoCodigo LIKE ?
        `;

        db.query(
          countQuery,
          [
            exactValue,
            exactValue,
            exactValue,
            exactValue,
            likeValue,
            likeValue,
          ],
          (err, countResult) => {
            if (err) return reject(err);
            resolve({
              alquilerPrendas: results,
              total: countResult[0]?.total || 0,
            });
          }
        );
      });
    });
  },
};

module.exports = AlquilerPrendas;
