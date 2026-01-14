const db = require("../config/db");

const DivisaMovimiento = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM divisamovimiento", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        `SELECT dm.*, 
          c.CajaDescripcion,
          d.DivisaNombre,
          u.UsuarioNombre
        FROM divisamovimiento dm
        LEFT JOIN caja c ON dm.CajaId = c.CajaId
        LEFT JOIN divisa d ON dm.DivisaId = d.DivisaId
        LEFT JOIN usuario u ON dm.UsuarioId = u.UsuarioId
        WHERE dm.DivisaMovimientoId = ?`,
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  getAllPaginated: (
    limit,
    offset,
    sortBy = "DivisaMovimientoId",
    sortOrder = "DESC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "DivisaMovimientoId",
        "CajaId",
        "DivisaMovimientoFecha",
        "DivisaMovimientoTipo",
        "DivisaId",
        "DivisaMovimientoCambio",
        "DivisaMovimientoCantidad",
        "DivisaMovimientoMonto",
        "UsuarioId",
      ];
      const allowedSortOrders = ["ASC", "DESC"];

      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "DivisaMovimientoId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      const query = `
        SELECT dm.*, 
          c.CajaDescripcion,
          d.DivisaNombre,
          u.UsuarioNombre
        FROM divisamovimiento dm
        LEFT JOIN caja c ON dm.CajaId = c.CajaId
        LEFT JOIN divisa d ON dm.DivisaId = d.DivisaId
        LEFT JOIN usuario u ON dm.UsuarioId = u.UsuarioId
        ORDER BY dm.${sortField} ${order}
        LIMIT ? OFFSET ?
      `;

      db.query(query, [limit, offset], (err, results) => {
        if (err) return reject(err);

        db.query(
          "SELECT COUNT(*) as total FROM divisamovimiento",
          (err, countResult) => {
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
          }
        );
      });
    });
  },

  search: async (
    term,
    limit,
    offset,
    sortBy = "DivisaMovimientoId",
    sortOrder = "DESC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "DivisaMovimientoId",
        "CajaId",
        "DivisaMovimientoFecha",
        "DivisaMovimientoTipo",
        "DivisaId",
        "DivisaMovimientoCambio",
        "DivisaMovimientoCantidad",
        "DivisaMovimientoMonto",
        "UsuarioId",
      ];
      const allowedSortOrders = ["ASC", "DESC"];

      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "DivisaMovimientoId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      const searchQuery = `
        SELECT dm.*, 
          c.CajaDescripcion,
          d.DivisaNombre,
          u.UsuarioNombre
        FROM divisamovimiento dm
        LEFT JOIN caja c ON dm.CajaId = c.CajaId
        LEFT JOIN divisa d ON dm.DivisaId = d.DivisaId
        LEFT JOIN usuario u ON dm.UsuarioId = u.UsuarioId
        WHERE dm.DivisaMovimientoTipo LIKE ? 
          OR CAST(dm.DivisaMovimientoId AS CHAR) LIKE ?
          OR CAST(dm.CajaId AS CHAR) LIKE ?
          OR CAST(dm.DivisaId AS CHAR) LIKE ?
          OR CAST(dm.DivisaMovimientoCambio AS CHAR) LIKE ?
          OR CAST(dm.DivisaMovimientoCantidad AS CHAR) LIKE ?
          OR CAST(dm.DivisaMovimientoMonto AS CHAR) LIKE ?
          OR CAST(dm.UsuarioId AS CHAR) LIKE ?
          OR c.CajaDescripcion LIKE ?
          OR d.DivisaNombre LIKE ?
          OR u.UsuarioNombre LIKE ?
        ORDER BY dm.${sortField} ${order}
        LIMIT ? OFFSET ?
      `;
      const searchValue = `%${term}%`;

      db.query(
        searchQuery,
        [
          searchValue,
          searchValue,
          searchValue,
          searchValue,
          searchValue,
          searchValue,
          searchValue,
          searchValue,
          searchValue,
          searchValue,
          searchValue,
          limit,
          offset,
        ],
        (err, results) => {
          if (err) {
            console.error("Error en la consulta de búsqueda:", err);
            return reject(err);
          }

          const countQuery = `
            SELECT COUNT(*) as total FROM divisamovimiento dm
            LEFT JOIN caja c ON dm.CajaId = c.CajaId
            LEFT JOIN divisa d ON dm.DivisaId = d.DivisaId
            LEFT JOIN usuario u ON dm.UsuarioId = u.UsuarioId
            WHERE dm.DivisaMovimientoTipo LIKE ? 
              OR CAST(dm.DivisaMovimientoId AS CHAR) LIKE ?
              OR CAST(dm.CajaId AS CHAR) LIKE ?
              OR CAST(dm.DivisaId AS CHAR) LIKE ?
              OR CAST(dm.DivisaMovimientoCambio AS CHAR) LIKE ?
              OR CAST(dm.DivisaMovimientoCantidad AS CHAR) LIKE ?
              OR CAST(dm.DivisaMovimientoMonto AS CHAR) LIKE ?
              OR CAST(dm.UsuarioId AS CHAR) LIKE ?
              OR c.CajaDescripcion LIKE ?
              OR d.DivisaNombre LIKE ?
              OR u.UsuarioNombre LIKE ?
          `;

          db.query(
            countQuery,
            [
              searchValue,
              searchValue,
              searchValue,
              searchValue,
              searchValue,
              searchValue,
              searchValue,
              searchValue,
              searchValue,
              searchValue,
              searchValue,
            ],
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

  create: (divisaMovimientoData) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO divisamovimiento (
          CajaId,
          DivisaMovimientoFecha,
          DivisaMovimientoTipo,
          DivisaId,
          DivisaMovimientoCambio,
          DivisaMovimientoCantidad,
          DivisaMovimientoMonto,
          UsuarioId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        divisaMovimientoData.CajaId,
        divisaMovimientoData.DivisaMovimientoFecha || new Date(),
        divisaMovimientoData.DivisaMovimientoTipo,
        divisaMovimientoData.DivisaId,
        divisaMovimientoData.DivisaMovimientoCambio || 0,
        divisaMovimientoData.DivisaMovimientoCantidad || 0,
        divisaMovimientoData.DivisaMovimientoMonto || 0,
        divisaMovimientoData.UsuarioId,
      ];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);

        // Obtener el registro recién creado
        DivisaMovimiento.getById(result.insertId)
          .then((divisaMovimiento) => resolve(divisaMovimiento))
          .catch((error) => reject(error));
      });
    });
  },

  update: (id, divisaMovimientoData) => {
    return new Promise((resolve, reject) => {
      let updateFields = [];
      let values = [];

      const camposActualizables = [
        "CajaId",
        "DivisaMovimientoFecha",
        "DivisaMovimientoTipo",
        "DivisaId",
        "DivisaMovimientoCambio",
        "DivisaMovimientoCantidad",
        "DivisaMovimientoMonto",
        "UsuarioId",
      ];

      camposActualizables.forEach((campo) => {
        if (divisaMovimientoData[campo] !== undefined) {
          updateFields.push(`${campo} = ?`);
          values.push(divisaMovimientoData[campo]);
        }
      });

      if (updateFields.length === 0) {
        return resolve(null);
      }

      values.push(id);

      const query = `
        UPDATE divisamovimiento 
        SET ${updateFields.join(", ")}
        WHERE DivisaMovimientoId = ?
      `;

      db.query(query, values, (err, result) => {
        if (err) return reject(err);

        if (result.affectedRows === 0) {
          return resolve(null);
        }

        // Obtener el registro actualizado
        DivisaMovimiento.getById(id)
          .then((divisaMovimiento) => resolve(divisaMovimiento))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM divisamovimiento WHERE DivisaMovimientoId = ?",
        [id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },
};

module.exports = DivisaMovimiento;
