const db = require("../config/db");

const TipoPrenda = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM tipoprenda", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM tipoprenda WHERE TipoPrendaId = ?",
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
    sortBy = "TipoPrendaId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = ["TipoPrendaId", "TipoPrendaNombre"];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "TipoPrendaId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      db.query(
        `SELECT * FROM tipoprenda ORDER BY ${sortField} ${order} LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, results) => {
          if (err) return reject(err);

          db.query(
            "SELECT COUNT(*) as total FROM tipoprenda",
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                tiposPrenda: results,
                total: countResult[0].total,
              });
            }
          );
        }
      );
    });
  },

  search: (term, limit, offset, sortBy = "TipoPrendaId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = ["TipoPrendaId", "TipoPrendaNombre"];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "TipoPrendaId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchQuery = `
        SELECT * FROM tipoprenda
        WHERE TipoPrendaNombre LIKE ?
        ORDER BY ${sortField} ${order}
        LIMIT ? OFFSET ?
      `;
      const searchValue = `%${term}%`;

      db.query(searchQuery, [searchValue, limit, offset], (err, results) => {
        if (err) return reject(err);

        const countQuery = `
            SELECT COUNT(*) as total FROM tipoprenda
            WHERE TipoPrendaNombre LIKE ?
          `;

        db.query(countQuery, [searchValue], (err, countResult) => {
          if (err) return reject(err);

          resolve({
            tiposPrenda: results,
            total: countResult[0]?.total || 0,
          });
        });
      });
    });
  },

  create: (tipoPrendaData) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO tipoprenda (TipoPrendaNombre)
        VALUES (?)
      `;
      const values = [tipoPrendaData.TipoPrendaNombre];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        resolve({
          TipoPrendaId: result.insertId,
          ...tipoPrendaData,
        });
      });
    });
  },

  update: (id, tipoPrendaData) => {
    return new Promise((resolve, reject) => {
      let updateFields = [];
      let values = [];
      const camposActualizables = ["TipoPrendaNombre"];

      camposActualizables.forEach((campo) => {
        if (tipoPrendaData[campo] !== undefined) {
          updateFields.push(`${campo} = ?`);
          values.push(tipoPrendaData[campo]);
        }
      });

      if (updateFields.length === 0) {
        return resolve(null);
      }

      values.push(id);
      const query = `
        UPDATE tipoprenda 
        SET ${updateFields.join(", ")}
        WHERE TipoPrendaId = ?
      `;

      db.query(query, values, async (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) {
          return resolve(null);
        }
        TipoPrenda.getById(id).then(resolve).catch(reject);
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM tipoprenda WHERE TipoPrendaId = ?",
        [id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },
};

module.exports = TipoPrenda;
