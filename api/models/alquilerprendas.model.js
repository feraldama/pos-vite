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
          p.ProductoImagen,
          tp.TipoPrendaNombre
        FROM alquilerprendas ap
        LEFT JOIN producto p ON ap.ProductoId = p.ProductoId
        LEFT JOIN tipoprenda tp ON p.TipoPrendaId = tp.TipoPrendaId
        WHERE ap.AlquilerId = ?
      `;

      db.query(query, [alquilerId], (err, results) => {
        if (err) return reject(err);
        // Convertir imágenes Buffer a base64
        const processedResults = results.map((row) => {
          if (row.ProductoImagen && Buffer.isBuffer(row.ProductoImagen)) {
            row.ProductoImagen = row.ProductoImagen.toString("base64");
          }
          return row;
        });
        resolve(processedResults);
      });
    });
  },

  create: (data) => {
    return new Promise((resolve, reject) => {
      const attemptInsert = (retries = 10) => {
        if (retries <= 0) {
          return reject(
            new Error(
              "No se pudo crear la prenda después de múltiples intentos"
            )
          );
        }

        // Primero obtener el siguiente ID sin bloqueo (lectura rápida)
        db.query(
          `SELECT COALESCE(MAX(AlquilerPrendasId), 0) as maxId 
           FROM alquilerprendas 
           WHERE AlquilerId = ?`,
          [data.AlquilerId],
          (err, results) => {
            if (err) {
              if (
                retries > 0 &&
                (err.code === "ER_LOCK_DEADLOCK" ||
                  err.code === "ER_LOCK_WAIT_TIMEOUT")
              ) {
                return setTimeout(
                  () => attemptInsert(retries - 1),
                  Math.random() * 50 + 10
                );
              }
              return reject(err);
            }

            const maxId = results[0]?.maxId || 0;
            const nextPrendasId = maxId + 1;

            // Intentar insertar directamente (optimistic locking)
            const insertQuery = `INSERT INTO alquilerprendas (
              AlquilerId,
              AlquilerPrendasId,
              ProductoId,
              AlquilerPrendasPrecio
            ) VALUES (?, ?, ?, ?)`;

            const values = [
              data.AlquilerId,
              nextPrendasId,
              data.ProductoId,
              data.AlquilerPrendasPrecio,
            ];

            db.query(insertQuery, values, (err, result) => {
              if (err) {
                // Si es error de clave duplicada, otra transacción insertó primero
                // Reintentar con un nuevo cálculo del ID
                if (err.code === "ER_DUP_ENTRY") {
                  return setTimeout(
                    () => attemptInsert(retries - 1),
                    Math.random() * 30 + 10
                  );
                }
                // Si es deadlock, reintentar
                if (
                  retries > 0 &&
                  (err.code === "ER_LOCK_DEADLOCK" ||
                    err.code === "ER_LOCK_WAIT_TIMEOUT")
                ) {
                  return setTimeout(
                    () => attemptInsert(retries - 1),
                    Math.random() * 100 + 50
                  );
                }
                return reject(err);
              }

              // Éxito, obtener el registro creado
              AlquilerPrendas.getById(data.AlquilerId, nextPrendasId)
                .then((alquilerPrendas) => resolve(alquilerPrendas))
                .catch((error) => reject(error));
            });
          }
        );
      };

      attemptInsert();
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

  // Verificar si una prenda está alquilada en un rango de fechas
  // Retorna los alquileres que tienen conflicto con el rango de fechas especificado
  verificarDisponibilidad: (productoId, fechaEntrega, fechaDevolucion) => {
    return new Promise((resolve, reject) => {
      // Verificar si hay alquileres existentes con el mismo ProductoId
      // donde el rango de fechas se solape y el estado no sea "Devuelto" o "Cancelado"
      const query = `
        SELECT 
          ap.ProductoId,
          a.AlquilerId,
          a.AlquilerFechaEntrega,
          a.AlquilerFechaDevolucion,
          a.AlquilerEstado,
          p.ProductoNombre,
          p.ProductoCodigo
        FROM alquilerprendas ap
        INNER JOIN alquiler a ON ap.AlquilerId = a.AlquilerId
        LEFT JOIN producto p ON ap.ProductoId = p.ProductoId
        WHERE ap.ProductoId = ?
        AND a.AlquilerEstado NOT IN ('Devuelto', 'Cancelado')
        AND a.AlquilerFechaEntrega IS NOT NULL
        AND a.AlquilerFechaDevolucion IS NOT NULL
        AND (
          -- El nuevo rango se solapa con el existente si:
          -- fechaEntregaNueva <= fechaDevolucionExistente 
          -- AND fechaDevolucionNueva >= fechaEntregaExistente
          (DATE(?) <= DATE(a.AlquilerFechaDevolucion)
          AND DATE(?) >= DATE(a.AlquilerFechaEntrega))
        )
      `;

      db.query(
        query,
        [productoId, fechaEntrega, fechaDevolucion],
        (err, results) => {
          if (err) {
            console.error("Error en verificarDisponibilidad:", err);
            return reject(err);
          }
          resolve(results);
        }
      );
    });
  },
};

module.exports = AlquilerPrendas;
