const db = require("../config/db");

const Nomina = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query(
        `SELECT n.*, 
          c.ColegioNombre,
          cc.ColegioCursoNombre
        FROM nomina n
        LEFT JOIN colegio c ON n.ColegioId = c.ColegioId
        LEFT JOIN colegiocurso cc ON n.ColegioId = cc.ColegioId AND n.ColegioCursoId = cc.ColegioCursoId`,
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
        `SELECT n.*, 
          c.ColegioNombre,
          cc.ColegioCursoNombre
        FROM nomina n
        LEFT JOIN colegio c ON n.ColegioId = c.ColegioId
        LEFT JOIN colegiocurso cc ON n.ColegioId = cc.ColegioId AND n.ColegioCursoId = cc.ColegioCursoId
        WHERE n.NominaId = ?`,
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  getAllPaginated: (limit, offset, sortBy = "NominaId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "NominaId",
        "NominaNombre",
        "NominaApellido",
        "ColegioId",
        "ColegioCursoId",
      ];
      const allowedSortOrders = ["ASC", "DESC"];

      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "NominaId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const query = `
        SELECT n.*, 
          c.ColegioNombre,
          cc.ColegioCursoNombre
        FROM nomina n
        LEFT JOIN colegio c ON n.ColegioId = c.ColegioId
        LEFT JOIN colegiocurso cc ON n.ColegioId = cc.ColegioId AND n.ColegioCursoId = cc.ColegioCursoId
        ORDER BY n.${sortField} ${order}
        LIMIT ? OFFSET ?
      `;

      db.query(query, [limit, offset], (err, results) => {
        if (err) return reject(err);

        db.query("SELECT COUNT(*) as total FROM nomina", (err, countResult) => {
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
    sortBy = "NominaId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "NominaId",
        "NominaNombre",
        "NominaApellido",
        "ColegioId",
        "ColegioCursoId",
      ];
      const allowedSortOrders = ["ASC", "DESC"];

      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "NominaId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchQuery = `
        SELECT n.*, 
          c.ColegioNombre,
          cc.ColegioCursoNombre
        FROM nomina n
        LEFT JOIN colegio c ON n.ColegioId = c.ColegioId
        LEFT JOIN colegiocurso cc ON n.ColegioId = cc.ColegioId AND n.ColegioCursoId = cc.ColegioCursoId
        WHERE n.NominaNombre LIKE ? 
          OR n.NominaApellido LIKE ?
          OR CAST(n.NominaId AS CHAR) LIKE ?
          OR CAST(n.ColegioId AS CHAR) LIKE ?
          OR CAST(n.ColegioCursoId AS CHAR) LIKE ?
          OR c.ColegioNombre LIKE ?
          OR cc.ColegioCursoNombre LIKE ?
        ORDER BY n.${sortField} ${order}
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
          if (err) return reject(err);

          db.query(
            `SELECT COUNT(*) as total 
            FROM nomina n
            LEFT JOIN colegio c ON n.ColegioId = c.ColegioId
            LEFT JOIN colegiocurso cc ON n.ColegioId = cc.ColegioId AND n.ColegioCursoId = cc.ColegioCursoId
            WHERE n.NominaNombre LIKE ? 
              OR n.NominaApellido LIKE ?
              OR CAST(n.NominaId AS CHAR) LIKE ?
              OR CAST(n.ColegioId AS CHAR) LIKE ?
              OR CAST(n.ColegioCursoId AS CHAR) LIKE ?
              OR c.ColegioNombre LIKE ?
              OR cc.ColegioCursoNombre LIKE ?`,
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

  create: (nominaData) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO nomina (
          NominaNombre,
          NominaApellido,
          ColegioId,
          ColegioCursoId
        ) VALUES (?, ?, ?, ?)
      `;

      db.query(
        query,
        [
          nominaData.NominaNombre,
          nominaData.NominaApellido,
          nominaData.ColegioId,
          nominaData.ColegioCursoId,
        ],
        (err, result) => {
          if (err) return reject(err);

          Nomina.getById(result.insertId)
            .then((nomina) => resolve(nomina))
            .catch((error) => reject(error));
        }
      );
    });
  },

  update: (id, nominaData) => {
    return new Promise((resolve, reject) => {
      let updateFields = [];
      let values = [];

      const camposActualizables = [
        "NominaNombre",
        "NominaApellido",
        "ColegioId",
        "ColegioCursoId",
      ];

      camposActualizables.forEach((campo) => {
        if (
          nominaData[campo] !== undefined &&
          nominaData[campo] !== null &&
          nominaData[campo] !== ""
        ) {
          updateFields.push(`${campo} = ?`);
          // Convertir a número si es ColegioId o ColegioCursoId
          if (campo === "ColegioId" || campo === "ColegioCursoId") {
            values.push(Number(nominaData[campo]));
          } else {
            values.push(nominaData[campo]);
          }
        }
      });

      if (updateFields.length === 0) {
        // Si no hay campos para actualizar, devolver la nomina actual sin cambios
        return Nomina.getById(id)
          .then((nomina) => resolve(nomina))
          .catch((error) => reject(error));
      }

      values.push(id);

      const query = `
        UPDATE nomina 
        SET ${updateFields.join(", ")}
        WHERE NominaId = ?
      `;

      db.query(query, values, (err, result) => {
        if (err) return reject(err);

        if (result.affectedRows === 0) {
          return resolve(null);
        }

        // Obtener el registro actualizado
        Nomina.getById(id)
          .then((nomina) => resolve(nomina))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query("DELETE FROM nomina WHERE NominaId = ?", [id], (err, result) => {
        if (err) return reject(err);
        resolve(result.affectedRows > 0);
      });
    });
  },
};

module.exports = Nomina;
