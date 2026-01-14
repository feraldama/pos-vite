const db = require("../config/db");

const CajaGasto = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM cajagasto", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM cajagasto WHERE CajaGastoId = ?",
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  getByCajaId: (cajaId) => {
    return new Promise((resolve, reject) => {
      db.query(
        `SELECT cg.*, tg.TipoGastoDescripcion, tgg.TipoGastoGrupoDescripcion
         FROM cajagasto cg
         LEFT JOIN tipogasto tg ON cg.TipoGastoId = tg.TipoGastoId
         LEFT JOIN tipogastogrupo tgg ON cg.TipoGastoId = tgg.TipoGastoId AND cg.TipoGastoGrupoId = tgg.TipoGastoGrupoId
         WHERE cg.CajaId = ?`,
        [cajaId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results);
        }
      );
    });
  },

  getByTipoGastoAndGrupo: (tipoGastoId, tipoGastoGrupoId) => {
    return new Promise((resolve, reject) => {
      db.query(
        `SELECT cg.*, tg.TipoGastoDescripcion, tgg.TipoGastoGrupoDescripcion
         FROM cajagasto cg
         LEFT JOIN tipogasto tg ON cg.TipoGastoId = tg.TipoGastoId
         LEFT JOIN tipogastogrupo tgg ON cg.TipoGastoId = tgg.TipoGastoId AND cg.TipoGastoGrupoId = tgg.TipoGastoGrupoId
         WHERE cg.TipoGastoId = ? AND cg.TipoGastoGrupoId = ?`,
        [tipoGastoId, tipoGastoGrupoId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results);
        }
      );
    });
  },

  create: (data) => {
    return new Promise((resolve, reject) => {
      // Obtener el siguiente CajaGastoId disponible para la caja
      db.query(
        "SELECT MAX(CajaGastoId) as maxId FROM cajagasto WHERE CajaId = ?",
        [data.CajaId],
        (err, results) => {
          if (err) return reject(err);
          const nextId = (results[0]?.maxId || 0) + 1;
          const query = `INSERT INTO cajagasto (CajaId, CajaGastoId, TipoGastoId, TipoGastoGrupoId) VALUES (?, ?, ?, ?)`;
          const values = [
            data.CajaId,
            nextId,
            data.TipoGastoId,
            data.TipoGastoGrupoId,
          ];
          db.query(query, values, (err, result) => {
            if (err) return reject(err);
            CajaGasto.getById(nextId)
              .then((gasto) => resolve(gasto))
              .catch((error) => reject(error));
          });
        }
      );
    });
  },

  update: (id, data) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE cajagasto SET CajaId = ?, TipoGastoId = ?, TipoGastoGrupoId = ? WHERE CajaGastoId = ?`;
      const values = [data.CajaId, data.TipoGastoId, data.TipoGastoGrupoId, id];
      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) return resolve(null);
        CajaGasto.getById(id)
          .then((gasto) => resolve(gasto))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM cajagasto WHERE CajaGastoId = ?",
        [id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },
};

module.exports = CajaGasto;
