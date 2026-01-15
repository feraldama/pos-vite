const db = require("../config/db");

const JSICobro = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM jsicobro", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT j.*, 
          c.CajaDescripcion,
          cl.ClienteNombre,
          cl.ClienteApellido
        FROM jsicobro j
        LEFT JOIN Caja c ON j.CajaId = c.CajaId
        LEFT JOIN clientes cl ON j.ClienteId = cl.ClienteId
        WHERE j.JSICobroId = ?
      `;
      db.query(query, [id], (err, results) => {
        if (err) return reject(err);
        resolve(results && results.length > 0 ? results[0] : null);
      });
    });
  },

  getAllPaginated: (
    limit,
    offset,
    sortBy = "JSICobroId",
    sortOrder = "DESC"
  ) => {
    return new Promise((resolve, reject) => {
      // Sanitiza sortOrder y sortBy para evitar SQL Injection
      const allowedSortFields = [
        "JSICobroId",
        "CajaId",
        "JSICobroFecha",
        "JSICobroCod",
        "ClienteId",
        "JSICobroMonto",
        "JSICobroUsuarioId",
      ];
      const allowedSortOrders = ["ASC", "DESC"];

      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "JSICobroFecha";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      const query = `
        SELECT j.*, 
          c.CajaDescripcion,
          cl.ClienteNombre,
          cl.ClienteApellido
        FROM jsicobro j
        LEFT JOIN Caja c ON j.CajaId = c.CajaId
        LEFT JOIN clientes cl ON j.ClienteId = cl.ClienteId
        ORDER BY j.${sortField} ${order}
        LIMIT ? OFFSET ?
      `;

      db.query(query, [limit, offset], (err, results) => {
        if (err) return reject(err);

        db.query(
          "SELECT COUNT(*) as total FROM jsicobro",
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
    sortBy = "JSICobroFecha",
    sortOrder = "DESC"
  ) => {
    return new Promise((resolve, reject) => {
      // Sanitiza los campos para evitar SQL Injection
      const allowedSortFields = [
        "JSICobroId",
        "CajaId",
        "JSICobroFecha",
        "JSICobroCod",
        "ClienteId",
        "JSICobroMonto",
        "JSICobroUsuarioId",
      ];
      const allowedSortOrders = ["ASC", "DESC"];

      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "JSICobroFecha";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      const searchQuery = `
        SELECT j.*, 
          c.CajaDescripcion,
          cl.ClienteNombre,
          cl.ClienteApellido
        FROM jsicobro j
        LEFT JOIN Caja c ON j.CajaId = c.CajaId
        LEFT JOIN clientes cl ON j.ClienteId = cl.ClienteId
        WHERE j.JSICobroCod LIKE ? 
          OR CAST(j.JSICobroId AS CHAR) LIKE ?
          OR CAST(j.CajaId AS CHAR) LIKE ?
          OR CAST(j.ClienteId AS CHAR) LIKE ?
          OR CAST(j.JSICobroMonto AS CHAR) LIKE ?
          OR CAST(j.JSICobroUsuarioId AS CHAR) LIKE ?
          OR DATE_FORMAT(j.JSICobroFecha, '%d/%m/%Y %H:%i:%s') LIKE ?
          OR cl.ClienteNombre LIKE ?
          OR cl.ClienteApellido LIKE ?
          OR c.CajaDescripcion LIKE ?
        ORDER BY j.${sortField} ${order}
        LIMIT ? OFFSET ?
      `;
      const searchValue = `%${term}%`;

      db.query(
        searchQuery,
        [
          searchValue, // JSICobroCod
          searchValue, // JSICobroId
          searchValue, // CajaId
          searchValue, // ClienteId
          searchValue, // JSICobroMonto
          searchValue, // JSICobroUsuarioId
          searchValue, // JSICobroFecha
          searchValue, // ClienteNombre
          searchValue, // ClienteApellido
          searchValue, // CajaDescripcion
          limit,
          offset,
        ],
        (err, results) => {
          if (err) {
            console.error("Error en la consulta de búsqueda:", err);
            return reject(err);
          }

          const countQuery = `
            SELECT COUNT(*) as total FROM jsicobro j
            LEFT JOIN Caja c ON j.CajaId = c.CajaId
            LEFT JOIN clientes cl ON j.ClienteId = cl.ClienteId
            WHERE j.JSICobroCod LIKE ? 
              OR CAST(j.JSICobroId AS CHAR) LIKE ?
              OR CAST(j.CajaId AS CHAR) LIKE ?
              OR CAST(j.ClienteId AS CHAR) LIKE ?
              OR CAST(j.JSICobroMonto AS CHAR) LIKE ?
              OR CAST(j.JSICobroUsuarioId AS CHAR) LIKE ?
              OR DATE_FORMAT(j.JSICobroFecha, '%d/%m/%Y %H:%i:%s') LIKE ?
              OR cl.ClienteNombre LIKE ?
              OR cl.ClienteApellido LIKE ?
              OR c.CajaDescripcion LIKE ?
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

  create: (jsicobroData) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO jsicobro (
          CajaId,
          JSICobroFecha,
          JSICobroCod,
          ClienteId,
          JSICobroMonto,
          JSICobroUsuarioId
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;

      const values = [
        jsicobroData.CajaId || null,
        jsicobroData.JSICobroFecha || new Date(),
        jsicobroData.JSICobroCod || "",
        jsicobroData.ClienteId || null,
        jsicobroData.JSICobroMonto || 0,
        jsicobroData.JSICobroUsuarioId || null,
      ];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);

        // Obtener el registro recién creado
        JSICobro.getById(result.insertId)
          .then((jsicobro) => resolve(jsicobro))
          .catch((error) => reject(error));
      });
    });
  },

  update: (id, jsicobroData) => {
    return new Promise((resolve, reject) => {
      // Construir la consulta dinámicamente
      let updateFields = [];
      let values = [];

      const camposActualizables = [
        "CajaId",
        "JSICobroFecha",
        "JSICobroCod",
        "ClienteId",
        "JSICobroMonto",
        "JSICobroUsuarioId",
      ];

      camposActualizables.forEach((campo) => {
        if (jsicobroData[campo] !== undefined) {
          updateFields.push(`${campo} = ?`);
          values.push(jsicobroData[campo]);
        }
      });

      if (updateFields.length === 0) {
        return resolve(null); // No hay campos para actualizar
      }

      values.push(id);

      const query = `
        UPDATE jsicobro 
        SET ${updateFields.join(", ")}
        WHERE JSICobroId = ?
      `;

      db.query(query, values, (err, result) => {
        if (err) return reject(err);

        if (result.affectedRows === 0) {
          return resolve(null); // No se encontró el registro
        }

        // Obtener el registro actualizado
        JSICobro.getById(id)
          .then((jsicobro) => resolve(jsicobro))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM jsicobro WHERE JSICobroId = ?",
        [id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },
};

module.exports = JSICobro;
