const db = require("../config/db");

const HorarioUso = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM horariouso", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM horariouso WHERE HorarioUsoId = ?",
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  create: (horarioUsoData) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO horariouso (HorarioUsoDesde, HorarioUsoHasta) VALUES (?, ?)`;
      const values = [
        horarioUsoData.HorarioUsoDesde,
        horarioUsoData.HorarioUsoHasta,
      ];
      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        // Obtener el horario recién creado
        HorarioUso.getById(result.insertId)
          .then((horario) => resolve(horario))
          .catch((error) => reject(error));
      });
    });
  },

  update: (id, horarioUsoData) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE horariouso SET HorarioUsoDesde = ?, HorarioUsoHasta = ? WHERE HorarioUsoId = ?`;
      const values = [
        horarioUsoData.HorarioUsoDesde,
        horarioUsoData.HorarioUsoHasta,
        id,
      ];
      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) return resolve(null);
        HorarioUso.getById(id)
          .then((horario) => resolve(horario))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM horariouso WHERE HorarioUsoId = ?",
        [id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },

  getAllPaginated: (limit, offset, sortBy = "HorarioUsoId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "HorarioUsoId",
        "HorarioUsoDesde",
        "HorarioUsoHasta",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "HorarioUsoId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      db.query(
        `SELECT * FROM horariouso ORDER BY ${sortField} ${order} LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, results) => {
          if (err) return reject(err);

          db.query(
            "SELECT COUNT(*) as total FROM horariouso",
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                horarios: results,
                total: countResult[0].total,
              });
            }
          );
        }
      );
    });
  },

  searchHorarios: (
    term,
    limit,
    offset,
    sortBy = "HorarioUsoId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "HorarioUsoId",
        "HorarioUsoDesde",
        "HorarioUsoHasta",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "HorarioUsoId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchQuery = `
        SELECT * FROM horariouso
        WHERE CAST(HorarioUsoId AS CHAR) LIKE ?
        OR DATE_FORMAT(HorarioUsoDesde, '%Y-%m-%d %H:%i:%s') LIKE ?
        OR DATE_FORMAT(HorarioUsoHasta, '%Y-%m-%d %H:%i:%s') LIKE ?
        ORDER BY ${sortField} ${order}
        LIMIT ? OFFSET ?
      `;
      const searchValue = `%${term}%`;

      db.query(
        searchQuery,
        [searchValue, searchValue, searchValue, limit, offset],
        (err, results) => {
          if (err) return reject(err);

          const countQuery = `
            SELECT COUNT(*) as total FROM horariouso
            WHERE CAST(HorarioUsoId AS CHAR) LIKE ?
            OR DATE_FORMAT(HorarioUsoDesde, '%Y-%m-%d %H:%i:%s') LIKE ?
            OR DATE_FORMAT(HorarioUsoHasta, '%Y-%m-%d %H:%i:%s') LIKE ?
          `;
          db.query(
            countQuery,
            [searchValue, searchValue, searchValue],
            (err, countResult) => {
              if (err) return reject(err);
              resolve({
                horarios: results,
                total: countResult[0]?.total || 0,
              });
            }
          );
        }
      );
    });
  },
};

module.exports = HorarioUso;
