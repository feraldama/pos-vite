const db = require("../config/db");

const DivisaGasto = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM divisagasto", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM divisagasto WHERE DivisaGastoId = ?",
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  getByDivisaId: (divisaId) => {
    return new Promise((resolve, reject) => {
      db.query(
        `SELECT dg.*, 
          tg.TipoGastoDescripcion, 
          tgg.TipoGastoGrupoDescripcion
         FROM divisagasto dg
         LEFT JOIN tipogasto tg ON dg.TipoGastoId = tg.TipoGastoId
         LEFT JOIN tipogastogrupo tgg ON dg.TipoGastoId = tgg.TipoGastoId AND dg.TipoGastoGrupoId = tgg.TipoGastoGrupoId
         WHERE dg.DivisaId = ?`,
        [divisaId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results);
        }
      );
    });
  },

  create: (divisaGastoData) => {
    return new Promise((resolve, reject) => {
      // Primero obtener el máximo DivisaGastoId para este DivisaId
      db.query(
        "SELECT MAX(DivisaGastoId) as maxId FROM divisagasto WHERE DivisaId = ?",
        [divisaGastoData.DivisaId],
        (err, results) => {
          if (err) return reject(err);

          // Si no hay datos, empezar desde 1, sino usar el máximo + 1
          const nextId = (results[0]?.maxId || 0) + 1;

          const query = `
            INSERT INTO divisagasto (
              DivisaId,
              DivisaGastoId,
              TipoGastoId,
              TipoGastoGrupoId
            ) VALUES (?, ?, ?, ?)
          `;

          const values = [
            divisaGastoData.DivisaId,
            nextId,
            divisaGastoData.TipoGastoId,
            divisaGastoData.TipoGastoGrupoId,
          ];

          db.query(query, values, (err, result) => {
            if (err) return reject(err);

            // Obtener el registro recién creado usando DivisaId y DivisaGastoId
            db.query(
              "SELECT * FROM divisagasto WHERE DivisaId = ? AND DivisaGastoId = ?",
              [divisaGastoData.DivisaId, nextId],
              (err, results) => {
                if (err) return reject(err);
                if (results.length > 0) {
                  resolve(results[0]);
                } else {
                  reject(new Error("No se pudo obtener el registro creado"));
                }
              }
            );
          });
        }
      );
    });
  },

  update: (id, divisaGastoData) => {
    return new Promise((resolve, reject) => {
      let updateFields = [];
      let values = [];

      const camposActualizables = [
        "DivisaId",
        "TipoGastoId",
        "TipoGastoGrupoId",
      ];

      camposActualizables.forEach((campo) => {
        if (divisaGastoData[campo] !== undefined) {
          updateFields.push(`${campo} = ?`);
          values.push(divisaGastoData[campo]);
        }
      });

      if (updateFields.length === 0) {
        return resolve(null);
      }

      values.push(id);

      const query = `
        UPDATE divisagasto 
        SET ${updateFields.join(", ")}
        WHERE DivisaGastoId = ?
      `;

      db.query(query, values, (err, result) => {
        if (err) return reject(err);

        if (result.affectedRows === 0) {
          return resolve(null);
        }

        // Obtener el registro actualizado
        DivisaGasto.getById(id)
          .then((divisaGasto) => resolve(divisaGasto))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM divisagasto WHERE DivisaGastoId = ?",
        [id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },

  deleteByDivisaId: (divisaId) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM divisagasto WHERE DivisaId = ?",
        [divisaId],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },
};

module.exports = DivisaGasto;
