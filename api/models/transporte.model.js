const db = require("../config/db");

const Transporte = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM transporte", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM transporte WHERE TransporteId = ?",
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
    sortBy = "TransporteId",
    sortOrder = "DESC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "TransporteId",
        "TransporteNombre",
        "TransporteTelefono",
        "TransporteDireccion",
        "TipoGastoId",
        "TipoGastoGrupoId",
        "TransporteComision",
      ];
      const allowedSortOrders = ["ASC", "DESC"];

      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "TransporteId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      const query = `
        SELECT t.*, 
          tg.TipoGastoDescripcion, 
          tgg.TipoGastoGrupoDescripcion
        FROM transporte t
        LEFT JOIN TipoGasto tg ON t.TipoGastoId = tg.TipoGastoId
        LEFT JOIN tipogastogrupo tgg ON t.TipoGastoId = tgg.TipoGastoId AND t.TipoGastoGrupoId = tgg.TipoGastoGrupoId
        ORDER BY t.${sortField} ${order}
        LIMIT ? OFFSET ?
      `;

      db.query(query, [limit, offset], (err, results) => {
        if (err) return reject(err);

        db.query(
          "SELECT COUNT(*) as total FROM transporte",
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
    sortBy = "TransporteId",
    sortOrder = "DESC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "TransporteId",
        "TransporteNombre",
        "TransporteTelefono",
        "TransporteDireccion",
        "TipoGastoId",
        "TipoGastoGrupoId",
        "TransporteComision",
      ];
      const allowedSortOrders = ["ASC", "DESC"];

      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "TransporteId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      const searchQuery = `
        SELECT t.*, 
          tg.TipoGastoDescripcion, 
          tgg.TipoGastoGrupoDescripcion
        FROM transporte t
        LEFT JOIN TipoGasto tg ON t.TipoGastoId = tg.TipoGastoId
        LEFT JOIN tipogastogrupo tgg ON t.TipoGastoId = tgg.TipoGastoId AND t.TipoGastoGrupoId = tgg.TipoGastoGrupoId
        WHERE t.TransporteNombre LIKE ? 
          OR t.TransporteTelefono LIKE ?
          OR t.TransporteDireccion LIKE ?
          OR CAST(t.TransporteId AS CHAR) LIKE ?
          OR CAST(t.TipoGastoId AS CHAR) LIKE ?
          OR CAST(t.TipoGastoGrupoId AS CHAR) LIKE ?
          OR CAST(t.TransporteComision AS CHAR) LIKE ?
        ORDER BY t.${sortField} ${order}
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
          limit,
          offset,
        ],
        (err, results) => {
          if (err) {
            console.error("Error en la consulta de búsqueda:", err);
            return reject(err);
          }

          const countQuery = `
            SELECT COUNT(*) as total FROM transporte 
            WHERE TransporteNombre LIKE ? 
              OR TransporteTelefono LIKE ?
              OR TransporteDireccion LIKE ?
              OR CAST(TransporteId AS CHAR) LIKE ?
              OR CAST(TipoGastoId AS CHAR) LIKE ?
              OR CAST(TipoGastoGrupoId AS CHAR) LIKE ?
              OR CAST(TransporteComision AS CHAR) LIKE ?
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

  create: (transporteData) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO transporte (
          TransporteNombre,
          TransporteTelefono,
          TransporteDireccion,
          TipoGastoId,
          TipoGastoGrupoId,
          TransporteComision
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;

      const values = [
        transporteData.TransporteNombre,
        transporteData.TransporteTelefono || "",
        transporteData.TransporteDireccion || "",
        transporteData.TipoGastoId,
        transporteData.TipoGastoGrupoId,
        transporteData.TransporteComision || 0,
      ];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);

        // Obtener el registro recién creado
        Transporte.getById(result.insertId)
          .then((transporte) => resolve(transporte))
          .catch((error) => reject(error));
      });
    });
  },

  update: (id, transporteData) => {
    return new Promise((resolve, reject) => {
      let updateFields = [];
      let values = [];

      const camposActualizables = [
        "TransporteNombre",
        "TransporteTelefono",
        "TransporteDireccion",
        "TipoGastoId",
        "TipoGastoGrupoId",
        "TransporteComision",
      ];

      camposActualizables.forEach((campo) => {
        if (transporteData[campo] !== undefined) {
          updateFields.push(`${campo} = ?`);
          values.push(transporteData[campo]);
        }
      });

      if (updateFields.length === 0) {
        return resolve(null);
      }

      values.push(id);

      const query = `
        UPDATE transporte 
        SET ${updateFields.join(", ")}
        WHERE TransporteId = ?
      `;

      db.query(query, values, (err, result) => {
        if (err) return reject(err);

        if (result.affectedRows === 0) {
          return resolve(null);
        }

        // Obtener el registro actualizado
        Transporte.getById(id)
          .then((transporte) => resolve(transporte))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM transporte WHERE TransporteId = ?",
        [id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },
};

module.exports = Transporte;
