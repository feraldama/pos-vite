const db = require("../config/db");

const WesternEnvio = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM westernenvio", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        `SELECT we.*, 
          c.CajaDescripcion, 
          t.TipoGastoDescripcion, 
          tg.TipoGastoGrupoDescripcion,
          u.UsuarioNombre
        FROM westernenvio we
        LEFT JOIN Caja c ON we.CajaId = c.CajaId
        LEFT JOIN TipoGasto t ON we.TipoGastoId = t.TipoGastoId
        LEFT JOIN tipogastogrupo tg ON we.TipoGastoId = tg.TipoGastoId AND we.TipoGastoGrupoId = tg.TipoGastoGrupoId
        LEFT JOIN usuario u ON we.UsuarioId = u.UsuarioId
        WHERE we.WesternEnvioId = ?`,
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
    sortBy = "WesternEnvioId",
    sortOrder = "DESC"
  ) => {
    return new Promise((resolve, reject) => {
      // Sanitiza sortOrder y sortBy para evitar SQL Injection
      const allowedSortFields = [
        "WesternEnvioId",
        "WesternEnvioFecha",
        "WesternEnvioMonto",
        "WesternEnvioDetalle",
        "TipoGastoId",
        "TipoGastoGrupoId",
        "UsuarioId",
        "CajaId",
      ];
      const allowedSortOrders = ["ASC", "DESC"];

      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "WesternEnvioId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      const query = `
        SELECT we.*, 
          c.CajaDescripcion, 
          t.TipoGastoDescripcion, 
          tg.TipoGastoGrupoDescripcion,
          u.UsuarioNombre
        FROM westernenvio we
        LEFT JOIN Caja c ON we.CajaId = c.CajaId
        LEFT JOIN TipoGasto t ON we.TipoGastoId = t.TipoGastoId
        LEFT JOIN tipogastogrupo tg ON we.TipoGastoId = tg.TipoGastoId AND we.TipoGastoGrupoId = tg.TipoGastoGrupoId
        LEFT JOIN usuario u ON we.UsuarioId = u.UsuarioId
        ORDER BY we.${sortField} ${order}
        LIMIT ? OFFSET ?
      `;

      db.query(query, [limit, offset], (err, results) => {
        if (err) return reject(err);

        db.query(
          "SELECT COUNT(*) as total FROM westernenvio",
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
    sortBy = "WesternEnvioId",
    sortOrder = "DESC"
  ) => {
    return new Promise((resolve, reject) => {
      // Sanitiza los campos para evitar SQL Injection
      const allowedSortFields = [
        "WesternEnvioId",
        "WesternEnvioFecha",
        "WesternEnvioMonto",
        "WesternEnvioDetalle",
        "TipoGastoId",
        "TipoGastoGrupoId",
        "UsuarioId",
        "CajaId",
      ];
      const allowedSortOrders = ["ASC", "DESC"];

      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "WesternEnvioId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      const searchQuery = `
        SELECT we.*, 
          c.CajaDescripcion, 
          t.TipoGastoDescripcion, 
          tg.TipoGastoGrupoDescripcion,
          u.UsuarioNombre
        FROM westernenvio we
        LEFT JOIN Caja c ON we.CajaId = c.CajaId
        LEFT JOIN TipoGasto t ON we.TipoGastoId = t.TipoGastoId
        LEFT JOIN tipogastogrupo tg ON we.TipoGastoId = tg.TipoGastoId AND we.TipoGastoGrupoId = tg.TipoGastoGrupoId
        LEFT JOIN usuario u ON we.UsuarioId = u.UsuarioId
        WHERE we.WesternEnvioDetalle LIKE ? 
          OR CAST(we.UsuarioId AS CHAR) LIKE ?
          OR CAST(we.CajaId AS CHAR) LIKE ?
          OR CAST(we.TipoGastoId AS CHAR) LIKE ?
          OR CAST(we.TipoGastoGrupoId AS CHAR) LIKE ?
          OR CAST(we.WesternEnvioMonto AS CHAR) LIKE ?
          OR CAST(we.WesternEnvioMTCN AS CHAR) LIKE ?
          OR CAST(we.WesternEnvioFactura AS CHAR) LIKE ?
          OR CAST(we.WesternEnvioTimbrado AS CHAR) LIKE ?
          OR DATE_FORMAT(we.WesternEnvioFecha, '%d/%m/%Y %H:%i:%s') LIKE ?
        ORDER BY we.${sortField} ${order}
        LIMIT ? OFFSET ?
      `;
      const searchValue = `%${term}%`;

      db.query(
        searchQuery,
        [
          searchValue, // Detalle
          searchValue, // UsuarioId
          searchValue, // CajaId
          searchValue, // TipoGastoId
          searchValue, // TipoGastoGrupoId
          searchValue, // Monto
          searchValue, // MTCN
          searchValue, // Factura
          searchValue, // Timbrado
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
            SELECT COUNT(*) as total FROM westernenvio 
            WHERE WesternEnvioDetalle LIKE ? 
              OR CAST(UsuarioId AS CHAR) LIKE ?
              OR CAST(CajaId AS CHAR) LIKE ?
              OR CAST(TipoGastoId AS CHAR) LIKE ?
              OR CAST(TipoGastoGrupoId AS CHAR) LIKE ?
              OR CAST(WesternEnvioMonto AS CHAR) LIKE ?
              OR CAST(WesternEnvioMTCN AS CHAR) LIKE ?
              OR CAST(WesternEnvioFactura AS CHAR) LIKE ?
              OR CAST(WesternEnvioTimbrado AS CHAR) LIKE ?
              OR DATE_FORMAT(WesternEnvioFecha, '%d/%m/%Y %H:%i:%s') LIKE ?
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

  create: (envioData) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO westernenvio (
          CajaId,
          WesternEnvioFecha,
          TipoGastoId,
          TipoGastoGrupoId,
          WesternEnvioCambio,
          WesternEnvioDetalle,
          WesternEnvioMTCN,
          WesternEnvioCargoEnvio,
          WesternEnvioFactura,
          WesternEnvioTimbrado,
          WesternEnvioMonto,
          UsuarioId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        envioData.CajaId,
        envioData.WesternEnvioFecha || new Date(),
        envioData.TipoGastoId,
        envioData.TipoGastoGrupoId,
        envioData.WesternEnvioCambio || 0,
        envioData.WesternEnvioDetalle,
        envioData.WesternEnvioMTCN || 0,
        envioData.WesternEnvioCargoEnvio || 0,
        envioData.WesternEnvioFactura || "",
        envioData.WesternEnvioTimbrado || "",
        envioData.WesternEnvioMonto,
        envioData.UsuarioId,
      ];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);

        // Obtener el registro recién creado
        WesternEnvio.getById(result.insertId)
          .then((envio) => resolve(envio))
          .catch((error) => reject(error));
      });
    });
  },

  update: (id, envioData) => {
    return new Promise((resolve, reject) => {
      // Construir la consulta dinámicamente
      let updateFields = [];
      let values = [];

      const camposActualizables = [
        "CajaId",
        "WesternEnvioFecha",
        "TipoGastoId",
        "TipoGastoGrupoId",
        "WesternEnvioCambio",
        "WesternEnvioDetalle",
        "WesternEnvioMTCN",
        "WesternEnvioCargoEnvio",
        "WesternEnvioFactura",
        "WesternEnvioTimbrado",
        "WesternEnvioMonto",
        "UsuarioId",
      ];

      camposActualizables.forEach((campo) => {
        if (envioData[campo] !== undefined) {
          updateFields.push(`${campo} = ?`);
          values.push(envioData[campo]);
        }
      });

      if (updateFields.length === 0) {
        return resolve(null); // No hay campos para actualizar
      }

      values.push(id);

      const query = `
        UPDATE westernenvio 
        SET ${updateFields.join(", ")}
        WHERE WesternEnvioId = ?
      `;

      db.query(query, values, (err, result) => {
        if (err) return reject(err);

        if (result.affectedRows === 0) {
          return resolve(null); // No se encontró el registro
        }

        // Obtener el registro actualizado
        WesternEnvio.getById(id)
          .then((envio) => resolve(envio))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM westernenvio WHERE WesternEnvioId = ?",
        [id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },
};

module.exports = WesternEnvio;
