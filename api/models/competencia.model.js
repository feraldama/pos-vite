const db = require("../config/db");

const Competencia = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM Competencia", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM Competencia WHERE CompetenciaId = ?",
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  create: (competenciaData) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO Competencia (CompetenciaNombre, CompetenciaFechaInicio, CompetenciaFechaFin) VALUES (?, ?, ?)`;
      db.query(
        query,
        [
          competenciaData.CompetenciaNombre,
          competenciaData.CompetenciaFechaInicio,
          competenciaData.CompetenciaFechaFin,
        ],
        (err, result) => {
          if (err) return reject(err);
          Competencia.getById(result.insertId)
            .then((competencia) => resolve(competencia))
            .catch((error) => reject(error));
        }
      );
    });
  },

  update: (id, competenciaData) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE Competencia SET CompetenciaNombre = ?, CompetenciaFechaInicio = ?, CompetenciaFechaFin = ? WHERE CompetenciaId = ?`;
      db.query(
        query,
        [
          competenciaData.CompetenciaNombre,
          competenciaData.CompetenciaFechaInicio,
          competenciaData.CompetenciaFechaFin,
          id,
        ],
        (err, result) => {
          if (err) return reject(err);
          if (result.affectedRows === 0) return resolve(null);
          Competencia.getById(id)
            .then((competencia) => resolve(competencia))
            .catch((error) => reject(error));
        }
      );
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM Competencia WHERE CompetenciaId = ?",
        [id],
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
    sortBy = "CompetenciaId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "CompetenciaId",
        "CompetenciaNombre",
        "CompetenciaFechaInicio",
        "CompetenciaFechaFin",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "CompetenciaId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      db.query(
        `SELECT * FROM Competencia ORDER BY ${sortField} ${order} LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, results) => {
          if (err) return reject(err);

          db.query(
            "SELECT COUNT(*) as total FROM Competencia",
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                competencias: results,
                total: countResult[0].total,
              });
            }
          );
        }
      );
    });
  },

  searchCompetencias: (
    term,
    limit,
    offset,
    sortBy = "CompetenciaId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "CompetenciaId",
        "CompetenciaNombre",
        "CompetenciaFechaInicio",
        "CompetenciaFechaFin",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "CompetenciaId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchQuery = `
        SELECT * FROM Competencia
        WHERE CompetenciaNombre LIKE ?
        ORDER BY ${sortField} ${order}
        LIMIT ? OFFSET ?
      `;
      const searchValue = `%${term}%`;

      db.query(searchQuery, [searchValue, limit, offset], (err, results) => {
        if (err) return reject(err);

        const countQuery = `
            SELECT COUNT(*) as total FROM Competencia
            WHERE CompetenciaNombre LIKE ?
          `;
        db.query(countQuery, [searchValue], (err, countResult) => {
          if (err) return reject(err);
          resolve({
            competencias: results,
            total: countResult[0]?.total || 0,
          });
        });
      });
    });
  },
};

module.exports = Competencia;
