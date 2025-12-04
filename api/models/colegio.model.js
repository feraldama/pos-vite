const db = require("../config/db");

const Colegio = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM colegio", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM colegio WHERE ColegioId = ?",
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  getAllPaginated: (limit, offset, sortBy = "ColegioId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "ColegioId",
        "ColegioNombre",
        "ColegioCantCurso",
        "TipoGastoId",
        "TipoGastoGrupoId",
      ];
      const allowedSortOrders = ["ASC", "DESC"];

      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "ColegioId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const query = `
        SELECT c.*, 
          tg.TipoGastoDescripcion, 
          tgg.TipoGastoGrupoDescripcion
        FROM colegio c
        LEFT JOIN TipoGasto tg ON c.TipoGastoId = tg.TipoGastoId
        LEFT JOIN tipogastogrupo tgg ON c.TipoGastoId = tgg.TipoGastoId AND c.TipoGastoGrupoId = tgg.TipoGastoGrupoId
        ORDER BY c.${sortField} ${order}
        LIMIT ? OFFSET ?
      `;

      db.query(query, [limit, offset], (err, results) => {
        if (err) return reject(err);

        db.query(
          "SELECT COUNT(*) as total FROM colegio",
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
    sortBy = "ColegioId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "ColegioId",
        "ColegioNombre",
        "ColegioCantCurso",
        "TipoGastoId",
        "TipoGastoGrupoId",
      ];
      const allowedSortOrders = ["ASC", "DESC"];

      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "ColegioId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchQuery = `
        SELECT c.*, 
          tg.TipoGastoDescripcion, 
          tgg.TipoGastoGrupoDescripcion
        FROM colegio c
        LEFT JOIN TipoGasto tg ON c.TipoGastoId = tg.TipoGastoId
        LEFT JOIN tipogastogrupo tgg ON c.TipoGastoId = tgg.TipoGastoId AND c.TipoGastoGrupoId = tgg.TipoGastoGrupoId
        WHERE c.ColegioNombre LIKE ? 
          OR CAST(c.ColegioId AS CHAR) LIKE ?
          OR CAST(c.ColegioCantCurso AS CHAR) LIKE ?
          OR CAST(c.TipoGastoId AS CHAR) LIKE ?
          OR CAST(c.TipoGastoGrupoId AS CHAR) LIKE ?
        ORDER BY c.${sortField} ${order}
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
          limit,
          offset,
        ],
        (err, results) => {
          if (err) {
            console.error("Error en la consulta de búsqueda:", err);
            return reject(err);
          }

          const countQuery = `
            SELECT COUNT(*) as total FROM colegio 
            WHERE ColegioNombre LIKE ? 
              OR CAST(ColegioId AS CHAR) LIKE ?
              OR CAST(ColegioCantCurso AS CHAR) LIKE ?
              OR CAST(TipoGastoId AS CHAR) LIKE ?
              OR CAST(TipoGastoGrupoId AS CHAR) LIKE ?
          `;

          db.query(
            countQuery,
            [searchValue, searchValue, searchValue, searchValue, searchValue],
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

  create: (colegioData) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO colegio (
          ColegioNombre,
          ColegioCantCurso,
          TipoGastoId,
          TipoGastoGrupoId
        ) VALUES (?, ?, ?, ?)
      `;

      const values = [
        colegioData.ColegioNombre,
        colegioData.ColegioCantCurso || 0,
        colegioData.TipoGastoId,
        colegioData.TipoGastoGrupoId,
      ];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);

        // Obtener el registro recién creado
        Colegio.getById(result.insertId)
          .then((colegio) => resolve(colegio))
          .catch((error) => reject(error));
      });
    });
  },

  update: (id, colegioData) => {
    return new Promise((resolve, reject) => {
      let updateFields = [];
      let values = [];

      // Campos editables por el usuario (excluir ColegioCantCurso que se actualiza automáticamente)
      const camposActualizables = [
        "ColegioNombre",
        "TipoGastoId",
        "TipoGastoGrupoId",
      ];

      camposActualizables.forEach((campo) => {
        if (
          colegioData[campo] !== undefined &&
          colegioData[campo] !== null &&
          colegioData[campo] !== ""
        ) {
          updateFields.push(`${campo} = ?`);
          // Convertir a número si es TipoGastoId o TipoGastoGrupoId
          if (campo === "TipoGastoId" || campo === "TipoGastoGrupoId") {
            values.push(Number(colegioData[campo]));
          } else {
            values.push(colegioData[campo]);
          }
        }
      });

      if (updateFields.length === 0) {
        // Si no hay campos para actualizar, devolver el colegio actual sin cambios
        return Colegio.getById(id)
          .then((colegio) => resolve(colegio))
          .catch((error) => reject(error));
      }

      values.push(id);

      const query = `
        UPDATE colegio 
        SET ${updateFields.join(", ")}
        WHERE ColegioId = ?
      `;

      db.query(query, values, (err, result) => {
        if (err) return reject(err);

        if (result.affectedRows === 0) {
          return resolve(null);
        }

        // Obtener el registro actualizado
        Colegio.getById(id)
          .then((colegio) => resolve(colegio))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM colegio WHERE ColegioId = ?",
        [id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },
};

module.exports = Colegio;
