const db = require("../config/db");

const PagoAdmin = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM pagoadmin", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM pagoadmin WHERE PagoAdminId = ?",
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
    sortBy = "PagoAdminId",
    sortOrder = "DESC"
  ) => {
    return new Promise((resolve, reject) => {
      // Sanitiza sortOrder y sortBy para evitar SQL Injection
      const allowedSortFields = [
        "PagoAdminId",
        "PagoAdminFecha",
        "PagoAdminMonto",
        "PagoAdminDetalle",
        "UsuarioId",
        "CajaId",
        "CajaOrigenId",
      ];
      const allowedSortOrders = ["ASC", "DESC"];

      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "PagoAdminFecha";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      const query = `
        SELECT p.*, 
          c.CajaDescripcion, 
          co.CajaDescripcion as CajaOrigenDescripcion
        FROM pagoadmin p
        LEFT JOIN Caja c ON p.CajaId = c.CajaId
        LEFT JOIN Caja co ON p.CajaOrigenId = co.CajaId
        ORDER BY p.${sortField} ${order}
        LIMIT ? OFFSET ?
      `;

      db.query(query, [limit, offset], (err, results) => {
        if (err) return reject(err);

        db.query(
          "SELECT COUNT(*) as total FROM pagoadmin",
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
    sortBy = "PagoAdminFecha",
    sortOrder = "DESC"
  ) => {
    return new Promise((resolve, reject) => {
      // Sanitiza los campos para evitar SQL Injection
      const allowedSortFields = [
        "PagoAdminId",
        "PagoAdminFecha",
        "PagoAdminMonto",
        "PagoAdminDetalle",
        "UsuarioId",
        "CajaId",
        "CajaOrigenId",
      ];
      const allowedSortOrders = ["ASC", "DESC"];

      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "PagoAdminFecha";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      const searchQuery = `
        SELECT p.*, 
          c.CajaDescripcion, 
          co.CajaDescripcion as CajaOrigenDescripcion
        FROM pagoadmin p
        LEFT JOIN Caja c ON p.CajaId = c.CajaId
        LEFT JOIN Caja co ON p.CajaOrigenId = co.CajaId
        WHERE p.PagoAdminDetalle LIKE ? 
          OR CAST(p.UsuarioId AS CHAR) LIKE ?
          OR CAST(p.CajaId AS CHAR) LIKE ?
          OR CAST(p.CajaOrigenId AS CHAR) LIKE ?
          OR CAST(p.PagoAdminMonto AS CHAR) LIKE ?
          OR DATE_FORMAT(p.PagoAdminFecha, '%d/%m/%Y %H:%i:%s') LIKE ?
        ORDER BY p.${sortField} ${order}
        LIMIT ? OFFSET ?
      `;
      const searchValue = `%${term}%`;

      db.query(
        searchQuery,
        [
          searchValue, // Detalle
          searchValue, // UsuarioId
          searchValue, // CajaId
          searchValue, // CajaOrigenId
          searchValue, // Monto
          searchValue, // Fecha
          limit,
          offset,
        ],
        (err, results) => {
          if (err) {
            console.error("Error en la consulta de búsqueda:", err);
            return reject(err);
          }

          const countQuery = `
            SELECT COUNT(*) as total FROM pagoadmin 
            WHERE PagoAdminDetalle LIKE ? 
              OR CAST(UsuarioId AS CHAR) LIKE ?
              OR CAST(CajaId AS CHAR) LIKE ?
              OR CAST(CajaOrigenId AS CHAR) LIKE ?
              OR CAST(PagoAdminMonto AS CHAR) LIKE ?
              OR DATE_FORMAT(PagoAdminFecha, '%d/%m/%Y %H:%i:%s') LIKE ?
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

  create: (pagoAdminData) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO pagoadmin (
          CajaOrigenId,
          CajaId,
          PagoAdminFecha,
          PagoAdminDetalle,
          PagoAdminMonto,
          UsuarioId
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;

      const values = [
        pagoAdminData.CajaOrigenId,
        pagoAdminData.CajaId,
        pagoAdminData.PagoAdminFecha || new Date(),
        pagoAdminData.PagoAdminDetalle,
        pagoAdminData.PagoAdminMonto,
        pagoAdminData.UsuarioId,
      ];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);

        // Obtener el registro recién creado
        PagoAdmin.getById(result.insertId)
          .then((pagoAdmin) => resolve(pagoAdmin))
          .catch((error) => reject(error));
      });
    });
  },

  update: (id, pagoAdminData) => {
    return new Promise((resolve, reject) => {
      // Construir la consulta dinámicamente
      let updateFields = [];
      let values = [];

      const camposActualizables = [
        "CajaOrigenId",
        "CajaId",
        "PagoAdminFecha",
        "PagoAdminDetalle",
        "PagoAdminMonto",
        "UsuarioId",
      ];

      camposActualizables.forEach((campo) => {
        if (pagoAdminData[campo] !== undefined) {
          updateFields.push(`${campo} = ?`);
          values.push(pagoAdminData[campo]);
        }
      });

      if (updateFields.length === 0) {
        return resolve(null); // No hay campos para actualizar
      }

      values.push(id);

      const query = `
        UPDATE pagoadmin 
        SET ${updateFields.join(", ")}
        WHERE PagoAdminId = ?
      `;

      db.query(query, values, (err, result) => {
        if (err) return reject(err);

        if (result.affectedRows === 0) {
          return resolve(null); // No se encontró el registro
        }

        // Obtener el registro actualizado
        PagoAdmin.getById(id)
          .then((pagoAdmin) => resolve(pagoAdmin))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM pagoadmin WHERE PagoAdminId = ?",
        [id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },
};

module.exports = PagoAdmin;
