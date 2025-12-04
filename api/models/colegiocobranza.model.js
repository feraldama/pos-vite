const db = require("../config/db");

const ColegioCobranza = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query(
        `SELECT cc.*, 
          c.CajaDescripcion,
          n.NominaNombre,
          n.NominaApellido,
          u.UsuarioNombre
        FROM colegiocobranza cc
        LEFT JOIN caja c ON cc.CajaId = c.CajaId
        LEFT JOIN nomina n ON cc.NominaId = n.NominaId
        LEFT JOIN usuario u ON cc.UsuarioId = u.UsuarioId`,
        (err, results) => {
          if (err) reject(err);
          resolve(results);
        }
      );
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        `SELECT cc.*, 
          c.CajaDescripcion,
          n.NominaNombre,
          n.NominaApellido,
          u.UsuarioNombre
        FROM colegiocobranza cc
        LEFT JOIN caja c ON cc.CajaId = c.CajaId
        LEFT JOIN nomina n ON cc.NominaId = n.NominaId
        LEFT JOIN usuario u ON cc.UsuarioId = u.UsuarioId
        WHERE cc.ColegioCobranzaId = ?`,
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
    sortBy = "ColegioCobranzaId",
    sortOrder = "DESC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "ColegioCobranzaId",
        "CajaId",
        "ColegioCobranzaFecha",
        "NominaId",
        "ColegioCobranzaMesPagado",
        "ColegioCobranzaMes",
        "ColegioCobranzaDiasMora",
        "ColegioCobranzaExamen",
        "UsuarioId",
        "ColegioCobranzaDescuento",
      ];
      const allowedSortOrders = ["ASC", "DESC"];

      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "ColegioCobranzaId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      const query = `
        SELECT cc.*, 
          c.CajaDescripcion,
          n.NominaNombre,
          n.NominaApellido,
          u.UsuarioNombre
        FROM colegiocobranza cc
        LEFT JOIN caja c ON cc.CajaId = c.CajaId
        LEFT JOIN nomina n ON cc.NominaId = n.NominaId
        LEFT JOIN usuario u ON cc.UsuarioId = u.UsuarioId
        ORDER BY cc.${sortField} ${order}
        LIMIT ? OFFSET ?
      `;

      db.query(query, [limit, offset], (err, results) => {
        if (err) return reject(err);

        db.query(
          "SELECT COUNT(*) as total FROM colegiocobranza",
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
    sortBy = "ColegioCobranzaId",
    sortOrder = "DESC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "ColegioCobranzaId",
        "CajaId",
        "ColegioCobranzaFecha",
        "NominaId",
        "ColegioCobranzaMesPagado",
        "ColegioCobranzaMes",
        "ColegioCobranzaDiasMora",
        "ColegioCobranzaExamen",
        "UsuarioId",
        "ColegioCobranzaDescuento",
      ];
      const allowedSortOrders = ["ASC", "DESC"];

      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "ColegioCobranzaId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      const searchQuery = `
        SELECT cc.*, 
          c.CajaDescripcion,
          n.NominaNombre,
          n.NominaApellido,
          u.UsuarioNombre
        FROM colegiocobranza cc
        LEFT JOIN caja c ON cc.CajaId = c.CajaId
        LEFT JOIN nomina n ON cc.NominaId = n.NominaId
        LEFT JOIN usuario u ON cc.UsuarioId = u.UsuarioId
        WHERE CAST(cc.ColegioCobranzaId AS CHAR) LIKE ?
          OR CAST(cc.CajaId AS CHAR) LIKE ?
          OR cc.ColegioCobranzaFecha LIKE ?
          OR CAST(cc.NominaId AS CHAR) LIKE ?
          OR cc.ColegioCobranzaMesPagado LIKE ?
          OR cc.ColegioCobranzaMes LIKE ?
          OR CAST(cc.ColegioCobranzaDiasMora AS CHAR) LIKE ?
          OR cc.ColegioCobranzaExamen LIKE ?
          OR CAST(cc.UsuarioId AS CHAR) LIKE ?
          OR CAST(cc.ColegioCobranzaDescuento AS CHAR) LIKE ?
          OR c.CajaDescripcion LIKE ?
          OR n.NominaNombre LIKE ?
          OR n.NominaApellido LIKE ?
          OR u.UsuarioNombre LIKE ?
        ORDER BY cc.${sortField} ${order}
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
          searchValue,
          searchValue,
          searchValue,
          limit,
          offset,
        ],
        (err, results) => {
          if (err) return reject(err);

          db.query(
            `SELECT COUNT(*) as total 
            FROM colegiocobranza cc
            LEFT JOIN caja c ON cc.CajaId = c.CajaId
            LEFT JOIN nomina n ON cc.NominaId = n.NominaId
            LEFT JOIN usuario u ON cc.UsuarioId = u.UsuarioId
            WHERE CAST(cc.ColegioCobranzaId AS CHAR) LIKE ?
              OR CAST(cc.CajaId AS CHAR) LIKE ?
              OR cc.ColegioCobranzaFecha LIKE ?
              OR CAST(cc.NominaId AS CHAR) LIKE ?
              OR cc.ColegioCobranzaMesPagado LIKE ?
              OR cc.ColegioCobranzaMes LIKE ?
              OR CAST(cc.ColegioCobranzaDiasMora AS CHAR) LIKE ?
              OR cc.ColegioCobranzaExamen LIKE ?
              OR CAST(cc.UsuarioId AS CHAR) LIKE ?
              OR CAST(cc.ColegioCobranzaDescuento AS CHAR) LIKE ?
              OR c.CajaDescripcion LIKE ?
              OR n.NominaNombre LIKE ?
              OR n.NominaApellido LIKE ?
              OR u.UsuarioNombre LIKE ?`,
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
              searchValue,
              searchValue,
              searchValue,
            ],
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
        }
      );
    });
  },

  create: (cobranzaData) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO colegiocobranza (
          CajaId,
          ColegioCobranzaFecha,
          NominaId,
          ColegioCobranzaMesPagado,
          ColegioCobranzaMes,
          ColegioCobranzaDiasMora,
          ColegioCobranzaExamen,
          UsuarioId,
          ColegioCobranzaDescuento
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        query,
        [
          cobranzaData.CajaId,
          cobranzaData.ColegioCobranzaFecha,
          cobranzaData.NominaId,
          cobranzaData.ColegioCobranzaMesPagado,
          cobranzaData.ColegioCobranzaMes,
          cobranzaData.ColegioCobranzaDiasMora,
          cobranzaData.ColegioCobranzaExamen,
          cobranzaData.UsuarioId,
          cobranzaData.ColegioCobranzaDescuento,
        ],
        (err, result) => {
          if (err) return reject(err);

          ColegioCobranza.getById(result.insertId)
            .then((cobranza) => resolve(cobranza))
            .catch((error) => reject(error));
        }
      );
    });
  },

  update: (id, cobranzaData) => {
    return new Promise((resolve, reject) => {
      let updateFields = [];
      let values = [];

      const camposActualizables = [
        "CajaId",
        "ColegioCobranzaFecha",
        "NominaId",
        "ColegioCobranzaMesPagado",
        "ColegioCobranzaMes",
        "ColegioCobranzaDiasMora",
        "ColegioCobranzaExamen",
        "UsuarioId",
        "ColegioCobranzaDescuento",
      ];

      camposActualizables.forEach((campo) => {
        if (
          cobranzaData[campo] !== undefined &&
          cobranzaData[campo] !== null &&
          cobranzaData[campo] !== ""
        ) {
          updateFields.push(`${campo} = ?`);
          // Convertir a número si es necesario
          if (
            campo === "CajaId" ||
            campo === "NominaId" ||
            campo === "UsuarioId" ||
            campo === "ColegioCobranzaDiasMora"
          ) {
            values.push(Number(cobranzaData[campo]));
          } else if (campo === "ColegioCobranzaDescuento") {
            values.push(Number(cobranzaData[campo]) || 0);
          } else {
            values.push(cobranzaData[campo]);
          }
        }
      });

      if (updateFields.length === 0) {
        // Si no hay campos para actualizar, devolver la cobranza actual sin cambios
        return ColegioCobranza.getById(id)
          .then((cobranza) => resolve(cobranza))
          .catch((error) => reject(error));
      }

      values.push(id);

      const query = `
        UPDATE colegiocobranza 
        SET ${updateFields.join(", ")}
        WHERE ColegioCobranzaId = ?
      `;

      db.query(query, values, (err, result) => {
        if (err) return reject(err);

        if (result.affectedRows === 0) {
          return resolve(null);
        }

        // Obtener el registro actualizado
        ColegioCobranza.getById(id)
          .then((cobranza) => resolve(cobranza))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM colegiocobranza WHERE ColegioCobranzaId = ?",
        [id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },
};

module.exports = ColegioCobranza;
