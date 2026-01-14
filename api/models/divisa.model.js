const db = require("../config/db");

const Divisa = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM divisa", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM divisa WHERE DivisaId = ?",
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  getAllPaginated: (limit, offset, sortBy = "DivisaId", sortOrder = "DESC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "DivisaId",
        "DivisaNombre",
        "DivisaCompraMonto",
        "DivisaVentaMonto",
      ];
      const allowedSortOrders = ["ASC", "DESC"];

      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "DivisaId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      const query = `
        SELECT * FROM divisa
        ORDER BY ${sortField} ${order}
        LIMIT ? OFFSET ?
      `;

      db.query(query, [limit, offset], (err, results) => {
        if (err) return reject(err);

        db.query("SELECT COUNT(*) as total FROM divisa", (err, countResult) => {
          if (err) return reject(err);

          resolve({
            data: results,
            pagination: {
              totalItems: countResult[0].total,
              totalPages: Math.ceil(countResult[0].total / limit),
              currentPage: Math.floor(offset / limit) + 1,
              itemsPerPage: limit,
            },
          });
        });
      });
    });
  },

  search: async (
    term,
    limit,
    offset,
    sortBy = "DivisaId",
    sortOrder = "DESC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "DivisaId",
        "DivisaNombre",
        "DivisaCompraMonto",
        "DivisaVentaMonto",
      ];
      const allowedSortOrders = ["ASC", "DESC"];

      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "DivisaId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      const searchQuery = `
        SELECT * FROM divisa
        WHERE DivisaNombre LIKE ? 
          OR CAST(DivisaId AS CHAR) LIKE ?
          OR CAST(DivisaCompraMonto AS CHAR) LIKE ?
          OR CAST(DivisaVentaMonto AS CHAR) LIKE ?
        ORDER BY ${sortField} ${order}
        LIMIT ? OFFSET ?
      `;
      const searchValue = `%${term}%`;

      db.query(
        searchQuery,
        [searchValue, searchValue, searchValue, searchValue, limit, offset],
        (err, results) => {
          if (err) {
            console.error("Error en la consulta de búsqueda:", err);
            return reject(err);
          }

          const countQuery = `
            SELECT COUNT(*) as total FROM divisa 
            WHERE DivisaNombre LIKE ? 
              OR CAST(DivisaId AS CHAR) LIKE ?
              OR CAST(DivisaCompraMonto AS CHAR) LIKE ?
              OR CAST(DivisaVentaMonto AS CHAR) LIKE ?
          `;

          db.query(
            countQuery,
            [searchValue, searchValue, searchValue, searchValue],
            (err, countResult) => {
              if (err) {
                console.error("Error en la consulta de conteo:", err);
                return reject(err);
              }

              const total = countResult[0]?.total || 0;

              resolve({
                data: results,
                pagination: {
                  totalItems: total,
                  totalPages: Math.ceil(total / limit),
                  currentPage: Math.floor(offset / limit) + 1,
                  itemsPerPage: limit,
                },
              });
            }
          );
        }
      );
    });
  },

  create: (divisaData) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO divisa (
          DivisaNombre,
          DivisaCompraMonto,
          DivisaVentaMonto
        ) VALUES (?, ?, ?)
      `;

      const values = [
        divisaData.DivisaNombre,
        divisaData.DivisaCompraMonto || 0,
        divisaData.DivisaVentaMonto || 0,
      ];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);

        // Obtener el registro recién creado
        Divisa.getById(result.insertId)
          .then((divisa) => resolve(divisa))
          .catch((error) => reject(error));
      });
    });
  },

  update: (id, divisaData) => {
    return new Promise((resolve, reject) => {
      let updateFields = [];
      let values = [];

      const camposActualizables = [
        "DivisaNombre",
        "DivisaCompraMonto",
        "DivisaVentaMonto",
      ];

      camposActualizables.forEach((campo) => {
        if (divisaData[campo] !== undefined) {
          updateFields.push(`${campo} = ?`);
          values.push(divisaData[campo]);
        }
      });

      if (updateFields.length === 0) {
        return resolve(null);
      }

      values.push(id);

      const query = `
        UPDATE divisa 
        SET ${updateFields.join(", ")}
        WHERE DivisaId = ?
      `;

      db.query(query, values, (err, result) => {
        if (err) return reject(err);

        if (result.affectedRows === 0) {
          return resolve(null);
        }

        // Obtener el registro actualizado
        Divisa.getById(id)
          .then((divisa) => resolve(divisa))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query("DELETE FROM divisa WHERE DivisaId = ?", [id], (err, result) => {
        if (err) return reject(err);
        resolve(result.affectedRows > 0);
      });
    });
  },
};

module.exports = Divisa;
